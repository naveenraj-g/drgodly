/**
 * PdfChatPanel — ask-the-document chat, right of the split.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * TEMPORARY alternate to DocumentChatPanel, wired to the new "pdf_chat" agent
 * (PDF_CHAT_AGENT_API_URL, via the /api/pdf-chat-agent proxy) instead of
 * DOCUMENT_AGENT_API_URL. DocumentChatPanel is left untouched so this can be
 * swapped back out later — see its usage in DocumentPreviewScreen.tsx.
 *
 * Unlike DocumentChatPanel's `{ file_id, message, patient_id, session_id }`
 * JSON contract, this agent is stateless per question: the proxy route
 * resolves `file_id` to the actual file bytes and posts `{ message, file }`
 * as multipart/form-data upstream, and the agent's stream carries no
 * session id to thread across turns.
 *
 * Stream shape (one JSON object per event, not necessarily one per line):
 *   { "type": "text_delta", "data": { "content": "...", "agent": "pdf_chat" } }
 *   { "type": "text_complete", "data": { "content": "...", "agent": "pdf_chat" } }
 * Objects arrive concatenated with no delimiter (and may be pretty-printed
 * across several chunks), so they're parsed with a brace-depth scanner
 * rather than split-by-line.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Square, User } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Starter questions, shown while the thread is empty.
 *
 * Phrased as things a doctor would actually ask of a result rather than generic
 * prompts — they double as a statement of what the feature is meant to answer.
 */
const SUGGESTED_PROMPTS = [
  "What's abnormal in this result?",
  "Summarise the key findings",
  "Which values are outside the reference range?",
  "What follow-up would you suggest?",
];

// ── Types ─────────────────────────────────────────────────────────────────────

/** One turn in the thread. */
interface ChatMessage {
  id: string;
  role: "doctor" | "assistant";
  text: string;
}

interface PdfChatPanelProps {
  /** FileNest fileId — the proxy route resolves this to the actual file bytes. */
  fileId: string;
  /** Filename, shown in the empty state so the thread has context. */
  fileTitle: string | null;
}

/** The event shapes the pdf_chat agent emits, reduced to what this panel acts on. */
type PdfChatStreamEvent =
  | { kind: "text_delta"; token: string }
  | { kind: "text_complete"; content: string }
  | { kind: "noop" };

// ── Stream parsing ───────────────────────────────────────────────────────────

/**
 * Scans a buffer for complete top-level `{...}` JSON objects, respecting
 * string literals (so braces inside quoted content don't throw off depth
 * counting). Needed because the pdf_chat agent's events are concatenated
 * with no delimiter and may be pretty-printed across multiple stream chunks,
 * so a naive line-split doesn't reliably isolate one event per line.
 *
 * @param buffer - Text accumulated so far (previous leftover + newly read chunk).
 * @returns Complete JSON object substrings found, and the unconsumed remainder to keep buffering.
 */
function extractJsonObjects(buffer: string): { objects: string[]; rest: string } {
  const objects: string[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;

  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];

    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        objects.push(buffer.slice(start, i + 1));
        start = -1;
      }
    }
  }

  // An object is mid-flight (depth > 0) — keep everything from its opening
  // brace. Otherwise nothing incomplete remains; whitespace between objects
  // can be safely dropped.
  const rest = depth > 0 && start !== -1 ? buffer.slice(start) : "";
  return { objects, rest };
}

/**
 * Parses one extracted JSON object string into a PdfChatStreamEvent.
 *
 * @param raw - A single, complete `{...}` JSON object string.
 */
function parsePdfChatEvent(raw: string): PdfChatStreamEvent {
  try {
    const p = JSON.parse(raw);
    switch (p.type) {
      case "text_delta":
        return { kind: "text_delta", token: String(p.data?.content ?? "") };
      case "text_complete":
        return { kind: "text_complete", content: String(p.data?.content ?? "") };
      default:
        return { kind: "noop" };
    }
  } catch {
    return { kind: "noop" };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Chat thread for questions about the previewed document, backed by the
 * pdf_chat agent. Temporary sibling to DocumentChatPanel.
 *
 * @param props - See PdfChatPanelProps.
 */
export function PdfChatPanel({ fileId, fileTitle }: PdfChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveText, setLiveText] = useState("");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const liveRef = useRef("");

  // A different file is a different conversation — reset during render
  // rather than in an effect, per React's "adjusting state when a prop
  // changes" pattern (avoids the extra render an effect-based reset would
  // cause). Mirrors DocumentChatPanel's approach.
  const [conversationFileId, setConversationFileId] = useState(fileId);
  if (conversationFileId !== fileId) {
    setConversationFileId(fileId);
    setMessages([]);
    setLiveText("");
  }

  useEffect(() => {
    liveRef.current = "";
    abortRef.current?.abort();
  }, [fileId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  const stopStreaming = useCallback(() => abortRef.current?.abort(), []);

  /**
   * Appends the accumulated assistant text as one message bubble and clears the buffer.
   *
   * @param text - Text to flush; ignored when blank.
   */
  const flushText = useCallback((text: string) => {
    liveRef.current = "";
    setLiveText("");
    const content = text.trim();
    if (content) {
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: "assistant", text: content },
      ]);
    }
  }, []);

  /**
   * Sends the doctor's question to the pdf_chat agent and streams the reply.
   *
   * @param text - The question. Ignored when blank or a reply is already streaming.
   */
  const sendMessage = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || isStreaming) return;

      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: "doctor", text: question },
      ]);
      setDraft("");
      setIsStreaming(true);
      liveRef.current = "";
      setLiveText("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/pdf-chat-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id: fileId, message: question }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Agent responded ${res.status}`);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { objects, rest } = extractJsonObjects(buffer);
          buffer = rest;

          for (const obj of objects) {
            const event = parsePdfChatEvent(obj);
            switch (event.kind) {
              case "text_delta":
                liveRef.current += event.token;
                setLiveText(liveRef.current);
                break;
              case "text_complete":
                flushText(event.content || liveRef.current);
                break;
              case "noop":
                break;
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Failed to get a response. Please try again.");
        }
      } finally {
        flushText(liveRef.current);
        setIsStreaming(false);
        inputRef.current?.focus();
      }
    },
    [fileId, isStreaming, flushText],
  );

  return (
    <div className="flex h-full flex-col">
      {/* ── Thread ── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {messages.length === 0 && !isStreaming ? (
            <div className="space-y-4 py-6">
              <div className="space-y-1.5 text-center">
                <Bot className="mx-auto size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Ask about this document</p>
                <p className="text-xs text-muted-foreground">
                  {fileTitle
                    ? `Questions about ${fileTitle} will be answered here.`
                    : "Questions about this file will be answered here."}
                </p>
              </div>

              <div className="space-y-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="w-full rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <ChatTurn key={m.id} message={m} />)
          )}

          {isStreaming && (
            <ChatTurn
              message={{ id: "live", role: "assistant", text: liveText }}
              pending={!liveText}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* ── Composer ── */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              /* Enter sends, Shift+Enter breaks the line — the convention in
                 every chat box a doctor already uses. */
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(draft);
              }
            }}
            placeholder="Ask a question about this document…"
            disabled={isStreaming}
            className="max-h-32 min-h-10 resize-none text-sm"
          />
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              onClick={stopStreaming}
              aria-label="Stop"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="size-9 shrink-0"
              disabled={draft.trim().length === 0}
              onClick={() => sendMessage(draft)}
              aria-label="Send question"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * One message bubble.
 *
 * @param message - The turn to render.
 * @param pending - True while streaming has started but no text has arrived yet — shows a typing indicator instead of empty text.
 */
function ChatTurn({
  message,
  pending = false,
}: {
  message: ChatMessage;
  pending?: boolean;
}) {
  const isDoctor = message.role === "doctor";

  return (
    <div className={cn("flex gap-2.5", isDoctor && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          isDoctor ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {isDoctor ? <User className="size-3" /> : <Bot className="size-3" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          isDoctor ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {pending ? (
          <span className="inline-flex gap-0.5 items-center">
            <span className="animate-bounce size-1 rounded-full bg-muted-foreground [animation-delay:0ms]" />
            <span className="animate-bounce size-1 rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="animate-bounce size-1 rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </span>
        ) : (
          message.text
        )}
      </div>
    </div>
  );
}
