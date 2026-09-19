"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Database,
  Send,
  Square,
  Stethoscope,
} from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Markdown } from "@/modules/client/shared/components/Markdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ─── Message types ────────────────────────────────────────────────────────────

type TChatMessage = {
  key: string;
  role: "user" | "assistant";
  content: string;
};
type TToolCall = {
  key: string;
  role: "tool_call";
  toolName: string;
  query: string;
};
type TToolResult = {
  key: string;
  role: "tool_result";
  toolName: string;
  /** Tabular rows, once any pagination envelope has been unwrapped to just its data — see unwrapEnvelope. */
  rows: Record<string, unknown>[] | null;
  /** The parsed payload as received — rendered directly when it isn't shaped like a table (e.g. a bare scalar or an array of primitives). */
  raw: unknown;
  success: boolean;
};
type TMessage = TChatMessage | TToolCall | TToolResult;

// ─── Stream event types ───────────────────────────────────────────────────────

type StreamEvent =
  | { kind: "text_delta"; token: string }
  | { kind: "text_complete" }
  | { kind: "tool_start"; toolName: string; query: string }
  | {
      kind: "tool_result";
      toolName: string;
      rows: Record<string, unknown>[] | null;
      raw: unknown;
      success: boolean;
    }
  | { kind: "session_id"; id: string }
  | { kind: "done"; sessionId?: string }
  | { kind: "noop" };

// ─── Tool result shaping ──────────────────────────────────────────────────────
// Different tools/resources return different envelopes — some a bare array,
// some a single resource object, some a paginated wrapper like
// { total, limit, offset, data: [...] }. Rather than special-casing each
// endpoint, detect the shape generically so any tool's response renders sensibly.

/**
 * Bookkeeping fields no doctor needs to see in a tool result — surfacing
 * them just adds noise to every table/nested view. Filtered out wherever
 * row/object fields are rendered, at every nesting depth.
 */
const HIDDEN_KEYS = new Set([
  "user_id",
  "org_id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
]);

/** Returns an object's entries with HIDDEN_KEYS fields removed. */
function visibleEntries(obj: Record<string, unknown>): [string, unknown][] {
  return Object.entries(obj).filter(([key]) => !HIDDEN_KEYS.has(key));
}

/**
 * Normalizes a parsed tool-result payload into table rows, dropping any
 * pagination wrapper — only the actual data is ever shown, never
 * total/limit/offset-style envelope fields.
 *
 * - A bare array of objects → used as rows directly.
 * - A single object with exactly one array-of-objects field and otherwise
 *   only scalar fields (e.g. `{total, limit, offset, data: [...]}`) → just
 *   that array is unwrapped as rows; the scalar envelope fields are discarded.
 * - Any other single object (a lone resource, no envelope) → shown as one row.
 * - A primitive, or an array of primitives → `null`; the caller falls back
 *   to rendering `raw` directly.
 *
 * @param parsed - The already-JSON-parsed tool output.
 */
function unwrapEnvelope(parsed: unknown): Record<string, unknown>[] | null {
  if (parsed == null) return null;

  const isRecordArray = (v: unknown): v is Record<string, unknown>[] =>
    Array.isArray(v) && v.every((item) => item !== null && typeof item === "object" && !Array.isArray(item));

  if (Array.isArray(parsed)) {
    return isRecordArray(parsed) ? parsed : null;
  }

  if (typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const entries = Object.entries(obj);
    const arrayEntries = entries.filter(([, v]) => isRecordArray(v));
    const scalarEntries = entries.filter(
      ([, v]) => v === null || (typeof v !== "object" && !Array.isArray(v)),
    );

    if (arrayEntries.length === 1 && arrayEntries.length + scalarEntries.length === entries.length) {
      const [, arr] = arrayEntries[0];
      return arr as Record<string, unknown>[];
    }

    return [obj];
  }

  return null;
}

function parseLine(raw: string): StreamEvent {
  const line = raw.startsWith("data:") ? raw.slice(5).trim() : raw.trim();
  if (!line) return { kind: "noop" };
  if (line === "[DONE]") return { kind: "done" };
  if (
    raw.startsWith("event:") ||
    raw.startsWith("id:") ||
    raw.startsWith("retry:")
  )
    return { kind: "noop" };

  try {
    const p = JSON.parse(line);
    switch (p.type) {
      case "text_delta": {
        const token = p.message ?? p.data?.content ?? p.content ?? "";
        return { kind: "text_delta", token: String(token) };
      }
      case "text_complete":
        return { kind: "text_complete" };
      case "tool_start": {
        const query = JSON.stringify(p.arguments ?? p.query ?? {}, null, 2);
        return {
          kind: "tool_start",
          toolName: p.tool ?? p.name ?? "tool",
          query,
        };
      }
      case "tool_result": {
        let parsedPayload: unknown = null;
        try {
          const raw = p.output ?? p.results;
          parsedPayload = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
          /* ignore */
        }
        return {
          kind: "tool_result",
          toolName: p.tool ?? p.name ?? "query",
          rows: unwrapEnvelope(parsedPayload),
          raw: parsedPayload,
          success: p.success ?? true,
        };
      }
      case "agent_end":
        return { kind: "done", sessionId: p.session_id };
      default: {
        if (p.session_id) return { kind: "session_id", id: p.session_id };
        // legacy fallbacks
        const flat = p.content ?? p.text ?? p.delta;
        if (typeof flat === "string")
          return { kind: "text_delta", token: flat };
        if (Array.isArray(p.choices)) {
          const c = p.choices[0]?.delta?.content;
          if (c !== undefined) return { kind: "text_delta", token: String(c) };
          if (p.choices[0]?.finish_reason) return { kind: "done" };
        }
        return { kind: "noop" };
      }
    }
  } catch {
    return raw.trim()
      ? { kind: "text_delta", token: raw.trim() }
      : { kind: "noop" };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToolCallBlock({
  toolName,
  query,
}: {
  toolName: string;
  query: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/40 text-xs overflow-hidden">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Database className="size-3 shrink-0 text-primary" />
        <span className="font-medium flex-1 text-left capitalize">
          {toolName.replace(/_/g, " ")}
        </span>
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
      </button>
      {expanded && (
        <pre className="px-3 pb-3 text-[11px] text-foreground/80 overflow-x-auto whitespace-pre leading-relaxed border-t border-border">
          {query}
        </pre>
      )}
    </div>
  );
}

/**
 * Renders one table cell's value for the *non-expandable* cases: null,
 * scalars, and arrays/objects that are already flat enough to summarize
 * inline. Anything that needs drill-down (array of objects, non-flat
 * object) is handled one level up by ExpandableCellValue instead.
 *
 * @param value - The cell's raw value, of any shape a FHIR resource field can take.
 */
function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/60 italic">–</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground/60 italic">–</span>;
    }
    return (
      <span className="block truncate whitespace-nowrap">
        {value.map((v) => (v === null ? "–" : String(v))).join(", ")}
      </span>
    );
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const summary = visibleEntries(obj)
      .map(([k, v]) => `${k}: ${v === null || v === undefined ? "–" : String(v)}`)
      .join(", ");
    return (
      <span className="block truncate whitespace-nowrap" title={summary}>
        {summary || "{}"}
      </span>
    );
  }
  return (
    <span className="block truncate whitespace-nowrap">
      {typeof value === "boolean" ? (value ? "true" : "false") : String(value)}
    </span>
  );
}

/** Whether a cell's value needs its own drill-down row rather than an inline summary. */
function isExpandableValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0 && value.some((v) => v !== null && typeof v === "object");
  }
  if (value !== null && typeof value === "object") {
    return visibleEntries(value as Record<string, unknown>).some(
      ([, v]) => v !== null && typeof v === "object",
    );
  }
  return false;
}

/**
 * One cell's value, plus — when it's an array of objects or a non-flat
 * object — a chevron toggle that expands an indented nested row/section
 * beneath it instead of a summary string. Delegates to CellValue for
 * anything that's already flat enough to show inline.
 *
 * @param value - The cell's raw value.
 * @param isExpanded - Whether the caller is currently showing this value's nested row.
 * @param onToggle - Flips isExpanded for this cell.
 */
function ExpandableCellValue({
  value,
  isExpanded,
  onToggle,
}: {
  value: unknown;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (!isExpandableValue(value)) return <CellValue value={value} />;

  const label = Array.isArray(value)
    ? `${value.length} item${value.length === 1 ? "" : "s"}`
    : "object";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      {isExpanded ? (
        <ChevronDown className="size-3 shrink-0" />
      ) : (
        <ChevronRight className="size-3 shrink-0" />
      )}
      {label}
    </button>
  );
}

/**
 * The nested content shown beneath an expanded cell — an array of objects
 * becomes its own mini ResultTable (recursing to any further depth), a
 * non-flat object becomes a field list (NestedObjectFields) whose own
 * fields can expand the same way.
 *
 * @param value - The expanded cell's array-of-objects or object value.
 * @param depth - Nesting level, purely for indentation.
 */
function NestedCellBody({ value, depth }: { value: unknown; depth: number }) {
  if (Array.isArray(value)) {
    return <ResultTable rows={value as Record<string, unknown>[]} depth={depth} />;
  }
  return <NestedObjectFields obj={value as Record<string, unknown>} depth={depth} />;
}

/**
 * Field list for a non-flat nested object — one "key: value" line per
 * field, each value going through ExpandableCellValue so a field that is
 * itself an array of objects (or another non-flat object) gets its own
 * expand toggle and indented nested section, to whatever depth the data has.
 *
 * @param obj - The object to list fields for.
 * @param depth - Nesting level, passed to any further-nested content.
 */
function NestedObjectFields({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-w-40 space-y-1 text-xs">
      {visibleEntries(obj).map(([key, value]) => (
        <div key={key}>
          <div className="flex items-start gap-2">
            <span className="shrink-0 font-medium text-muted-foreground">{key}:</span>
            <span className="min-w-0 flex-1">
              <ExpandableCellValue
                value={value}
                isExpanded={expandedKeys.has(key)}
                onToggle={() => toggle(key)}
              />
            </span>
          </div>
          {expandedKeys.has(key) && (
            <div className="mt-1 border-l-2 border-primary/30 py-1 pl-2">
              <NestedCellBody value={value} depth={depth + 1} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Renders tool-result rows as a table. Columns are the union of every row's
 * keys — resources returned by different tools don't always share identical
 * shape row-to-row, so relying on just `rows[0]` can silently drop fields.
 * A cell holding an array of objects (or a non-flat object) expands inline,
 * inserting an indented sub-row beneath it rather than opening any overlay
 * — recursing through the same table/field-list components at each further
 * level, so arbitrarily nested data stays navigable without stacked popovers.
 *
 * @param rows - Already-unwrapped rows (see unwrapEnvelope).
 * @param depth - Nesting level; 0 for the top-level result, incremented for each drill-down.
 */
function ResultTable({ rows, depth = 0 }: { rows: Record<string, unknown>[]; depth?: number }) {
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  if (rows.length === 0)
    return (
      <p className="text-xs text-muted-foreground py-1 px-2">
        No rows returned.
      </p>
    );

  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row).filter((key) => !HIDDEN_KEYS.has(key)))),
  );

  const toggle = (cellKey: string) => {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellKey)) next.delete(cellKey);
      else next.add(cellKey);
      return next;
    });
  };

  return (
    <div className={cn("rounded-lg border border-border text-xs overflow-hidden", depth > 0 && "border-dashed")}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap border-b border-border"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const expandedCols = columns.filter((col) => expandedCells.has(`${i}:${col}`));
              return (
                <Fragment key={i}>
                  <tr
                    className={cn(
                      "border-b border-border last:border-0",
                      i % 2 === 0 ? "bg-background" : "bg-muted/30",
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-2 align-top text-foreground/80 max-w-[220px]"
                      >
                        <ExpandableCellValue
                          value={row[col]}
                          isExpanded={expandedCells.has(`${i}:${col}`)}
                          onToggle={() => toggle(`${i}:${col}`)}
                        />
                      </td>
                    ))}
                  </tr>
                  {expandedCols.map((col) => (
                    <tr key={`${i}:${col}:nested`} className="bg-muted/10">
                      {/* colSpan makes this td as wide as the whole (possibly very wide)
                          table, positioned at column 1's x-offset — sticky pins its
                          content to the scroll container's visible left edge instead,
                          so it's on-screen immediately, wherever the row was scrolled
                          to when the toggle was clicked. */}
                      <td colSpan={columns.length} className="p-0">
                        <div
                          className="sticky left-0 w-max max-w-[min(90cqw,40rem)] border-l-2 border-primary/30 bg-background p-2 shadow-sm"
                          style={{ marginLeft: `${(depth + 1) * 12}px` }}
                        >
                          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {col}
                          </p>
                          <NestedCellBody value={row[col]} depth={depth + 1} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Fallback for tool results that couldn't be unwrapped into table rows —
 * a bare scalar, or an array of scalars with no object shape to tabulate.
 *
 * @param value - The parsed payload as received.
 * @param success - Whether the tool call itself reported success.
 */
function RawResultView({ value, success }: { value: unknown; success: boolean }) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-xs text-muted-foreground py-1 px-2">No rows returned.</p>;
    }
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
        {value.map((v, i) => (
          <div key={i} className="text-foreground/80">
            {v === null ? <span className="text-muted-foreground/60 italic">–</span> : String(v)}
          </div>
        ))}
      </div>
    );
  }
  return (
    <p className={cn("px-2 text-xs", success ? "text-foreground/80" : "text-destructive")}>
      {value === null || value === undefined ? "–" : String(value)}
    </p>
  );
}

// ─── Local storage ────────────────────────────────────────────────────────────

/** Persists whether tool-call/tool-result messages are shown, across sessions and appointments. */
const SHOW_TOOL_ACTIVITY_KEY = "doctor-assistant-show-tool-activity";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildApiMessage(
  text: string,
  apt: TAppointmentResponse | null,
): string {
  if (!apt) return text;
  const parts: string[] = [];
  parts.push(`appointment_id=${apt.id}`);
  if (apt.subject_id != null) parts.push(`patient_id=${apt.subject_id}`);
  if (apt.encounter_id != null) parts.push(`encounter_id=${apt.encounter_id}`);
  return parts.length ? `[FHIR context: ${parts.join(", ")}]\n\n${text}` : text;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  selectedAppointment: TAppointmentResponse | null;
}

export function DoctorAssistant({ selectedAppointment }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [drawerWidth, setDrawerWidth] = useState(520);
  // Tool-call/result activity is noisy by default — hidden unless the doctor
  // opts in, remembered across sessions via localStorage. Lazy-initialized
  // (rather than read in an effect) so the stored preference applies from
  // the very first render instead of flashing the default first.
  const [showToolActivity, setShowToolActivity] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SHOW_TOOL_ACTIVITY_KEY) === "true";
  });

  const abortRef = useRef<AbortController | null>(null);
  const liveRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(SHOW_TOOL_ACTIVITY_KEY, String(showToolActivity));
  }, [showToolActivity]);

  // Re-focus the input whenever the agent finishes streaming so the doctor
  // can type their next question without clicking the field manually —
  // mirrors TextIntake.tsx's same pattern.
  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus();
  }, [isStreaming]);

  useEffect(() => {
    setMessages([]);
    setSessionId(null);
    setLiveText("");
    liveRef.current = "";
  }, [selectedAppointment?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  const stopStreaming = useCallback(() => abortRef.current?.abort(), []);

  const resizeDrawer = useCallback((clientX: number) => {
    const availableWidth = window.innerWidth - 16;
    const nextWidth = Math.min(
      Math.max(window.innerWidth - clientX, 380),
      Math.min(900, availableWidth),
    );
    setDrawerWidth(nextWidth);
  }, []);

  const handleResizeStart = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      resizeDrawer(event.clientX);
    },
    [resizeDrawer],
  );

  const handleResizeMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        resizeDrawer(event.clientX);
      }
    },
    [resizeDrawer],
  );

  const flushText = useCallback(() => {
    const text = liveRef.current;
    liveRef.current = "";
    setLiveText("");
    if (text.trim()) {
      setMessages((prev) => [
        ...prev,
        { key: nanoid(), role: "assistant", content: text },
      ]);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setMessages((prev) => [
        ...prev,
        { key: nanoid(), role: "user", content: text },
      ]);
      setInput("");
      setIsStreaming(true);
      liveRef.current = "";
      setLiveText("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/mcp-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: buildApiMessage(text, selectedAppointment),
            session_id: sessionId,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Agent responded ${res.status}`);

        const sid = res.headers.get("X-Session-Id");
        if (sid) setSessionId(sid);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let leftover = "";

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = (
            leftover + decoder.decode(value, { stream: true })
          ).split("\n");
          leftover = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = parseLine(line);
            switch (event.kind) {
              case "text_delta":
                liveRef.current += event.token;
                setLiveText(liveRef.current);
                break;
              case "tool_start":
                if (liveRef.current.trim()) flushText();
                setMessages((prev) => [
                  ...prev,
                  {
                    key: nanoid(),
                    role: "tool_call",
                    toolName: event.toolName,
                    query: event.query,
                  },
                ]);
                break;
              case "tool_result":
                setMessages((prev) => [
                  ...prev,
                  {
                    key: nanoid(),
                    role: "tool_result",
                    toolName: event.toolName,
                    rows: event.rows,
                    raw: event.raw,
                    success: event.success,
                  },
                ]);
                break;
              case "session_id":
                setSessionId(event.id);
                break;
              case "done":
                if (event.sessionId) setSessionId(event.sessionId);
                break outer;
            }
          }
        }

        if (leftover.trim()) {
          const event = parseLine(leftover);
          if (event.kind === "text_delta") liveRef.current += event.token;
          if (event.kind === "session_id") setSessionId(event.id);
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Failed to get response. Please try again.");
        }
      } finally {
        flushText();
        setIsStreaming(false);
      }
    },
    [isStreaming, selectedAppointment, sessionId, flushText],
  );

  const patientName =
    selectedAppointment?.subject_display ??
    selectedAppointment?.participant?.find(
      (participant) => participant.reference_type === "Patient",
    )?.reference_display;
  const hasFhirContext =
    selectedAppointment != null &&
    (selectedAppointment.id != null || selectedAppointment.subject_id != null);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3",
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
          "transition-all duration-200 hover:shadow-xl hover:scale-105",
        )}
        aria-label="Open assistant"
      >
        <Stethoscope className="size-5" />
        <span className="text-sm font-medium">Assistant</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="@container flex h-full w-full max-w-none flex-col gap-0 p-0"
          style={{ width: `${drawerWidth}px`, maxWidth: "calc(100vw - 1rem)" }}
          // Radix focuses the first focusable element (the sheet's own
          // close button) by default when it opens — override that and put
          // the cursor straight in the question box instead.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize assistant panel"
            className="absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
          />
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <Bot className="size-4 text-primary-foreground" />
              </div>
              <SheetTitle className="text-base flex-1">Medical Assistant</SheetTitle>
              <label className="mr-7 flex items-center gap-1.5 text-xs text-muted-foreground">
                Show data lookups
                <Switch
                  size="sm"
                  checked={showToolActivity}
                  onCheckedChange={setShowToolActivity}
                />
              </label>
            </div>
            {selectedAppointment && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patientName && (
                  <Badge variant="secondary" className="text-xs">
                    <span className="font-semibold">Patient:</span>
                    {patientName}
                  </Badge>
                )}
                {hasFhirContext && (
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    EMR Data
                  </Badge>
                )}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3">
            {messages.length === 0 && !isStreaming && (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Bot className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">How can I help?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedAppointment
                      ? "Ask anything about this appointment or patient data."
                      : "Select an appointment or ask a general question."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 min-w-0 w-full">
              {messages.map((msg) => {
                if (msg.role === "user")
                  return (
                    <div key={msg.key} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground">
                        {msg.content}
                      </div>
                    </div>
                  );
                if (msg.role === "assistant")
                  return (
                    <div key={msg.key} className="flex justify-start">
                      <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-foreground">
                        {/* Markdown, not plain text — the agent's replies can (and
                            often do) come back with lists/bold/headings; plain
                            text with no Markdown syntax still renders correctly
                            as an ordinary paragraph, so this is safe either way. */}
                        <Markdown content={msg.content} className="[&_p]:first:mt-0 [&_p]:last:mb-0" />
                      </div>
                    </div>
                  );
                if (msg.role === "tool_call")
                  return showToolActivity ? (
                    <ToolCallBlock
                      key={msg.key}
                      toolName={msg.toolName}
                      query={msg.query}
                    />
                  ) : null;
                if (msg.role === "tool_result")
                  return !showToolActivity ? null : (
                    <div
                      key={msg.key}
                      className="w-full min-w-0 space-y-1 overflow-hidden"
                    >
                      {msg.rows ? (
                        <ResultTable rows={msg.rows} />
                      ) : msg.raw != null ? (
                        <RawResultView value={msg.raw} success={msg.success} />
                      ) : (
                        <p className="text-xs text-muted-foreground px-2">
                          {msg.success ? "No rows returned." : "Query failed."}
                        </p>
                      )}
                    </div>
                  );
                return null;
              })}

              {isStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
                    {liveText ? (
                      // Same Markdown treatment as a finished assistant bubble —
                      // rendering progressively as tokens stream in can briefly
                      // show unbalanced syntax (e.g. an unclosed **) until the
                      // closing token arrives, same tradeoff most streaming AI
                      // chat UIs accept for formatted output.
                      <Markdown content={liveText} className="[&_p]:first:mt-0 [&_p]:last:mb-0" />
                    ) : (
                      <span className="inline-flex gap-0.5 items-center">
                        <span className="animate-bounce size-1 rounded-full bg-muted-foreground [animation-delay:0ms]" />
                        <span className="animate-bounce size-1 rounded-full bg-muted-foreground [animation-delay:150ms]" />
                        <span className="animate-bounce size-1 rounded-full bg-muted-foreground [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask something…"
                disabled={isStreaming}
                className="flex-1 text-sm"
              />
              {isStreaming ? (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={stopStreaming}
                  className="shrink-0"
                >
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  className="shrink-0"
                >
                  <Send className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
