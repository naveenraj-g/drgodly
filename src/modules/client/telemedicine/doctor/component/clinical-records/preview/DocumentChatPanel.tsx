/**
 * DocumentChatPanel — ask-the-document chat, right of the split.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * Streams from DOCUMENT_AGENT_API_URL (via the /api/document-agent proxy, same
 * pattern as DoctorAssistant → /api/mcp-agent) with the payload the agent
 * expects: `{ file_id, message, patient_id, session_id }`. The agent retrieves
 * relevant chunks from this specific file (jina_embedding + medical_document_search
 * tool calls) before answering, but those tool calls and their raw results are
 * never rendered here — only the assistant's own prose. A doctor reading this
 * panel wants the answer, not the retrieval mechanics behind it.
 *
 * `session_id` is threaded through so the agent can keep context across turns
 * within one document; it resets whenever `fileId` changes, since a different
 * file is a different conversation.
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

/** One turn in the thread. Tool calls/results are intentionally not a role here — they're never shown. */
interface ChatMessage {
  id: string;
  role: "doctor" | "assistant";
  text: string;
}

interface DocumentChatPanelProps {
  /** FileNest fileId — scopes retrieval to this document and identifies the conversation. */
  fileId: string;
  /** FHIR Patient.id, sent so the agent can ground answers in the right patient's data. */
  patientId: number;
  /** Filename, shown in the empty state so the thread has context. */
  fileTitle: string | null;
}

/** The stream event shapes the document agent emits, reduced to what this panel acts on. */
type DocStreamEvent =
  | { kind: "text_delta"; token: string }
  | { kind: "text_complete"; content: string }
  | { kind: "tool_call" }
  | { kind: "session_id"; id: string }
  | { kind: "noop" };

// ── Stream parsing ───────────────────────────────────────────────────────────

/**
 * Parses one line of the document agent's stream into a DocStreamEvent.
 *
 * Tool call events (`tool_call_start` / `tool_call_complete`) are recognized
 * but collapsed to `{ kind: "tool_call" }` — the caller ignores them rather
 * than rendering the retrieval steps, per the "don't show tool activity"
 * requirement for this chat.
 *
 * @param raw - One line from the streamed response body.
 */
function parseDocLine(raw: string): DocStreamEvent {
  const line = raw.startsWith("data:") ? raw.slice(5).trim() : raw.trim();
  if (!line || line === "[DONE]") return { kind: "noop" };
  if (raw.startsWith("event:") || raw.startsWith("id:") || raw.startsWith("retry:"))
    return { kind: "noop" };

  try {
    const p = JSON.parse(line);
    switch (p.type) {
      case "text_delta":
        return { kind: "text_delta", token: String(p.data?.content ?? "") };
      case "text_complete":
        return { kind: "text_complete", content: String(p.data?.content ?? "") };
      case "tool_call_start":
      case "tool_call_complete":
        return { kind: "tool_call" };
      default: {
        const sid = p.session_id ?? p.data?.session_id;
        if (typeof sid === "string" && sid) return { kind: "session_id", id: sid };
        return { kind: "noop" };
      }
    }
  } catch {
    return { kind: "noop" };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Chat thread for questions about the previewed document.
 *
 * @param props - See DocumentChatPanelProps.
 */
export function DocumentChatPanel({ fileId, patientId, fileTitle }: DocumentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveText, setLiveText] = useState("");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const liveRef = useRef("");

  // A different file is a different conversation — the agent's session and
  // this thread's history shouldn't carry over. Reset during render (rather
  // than in an effect) by tracking which file the current state belongs to,
  // per React's "adjusting state when a prop changes" pattern — avoids the
  // extra render an effect-based reset would cause.
  const [conversationFileId, setConversationFileId] = useState(fileId);
  if (conversationFileId !== fileId) {
    setConversationFileId(fileId);
    setMessages([]);
    setSessionId("");
    setLiveText("");
  }

  // Refs aren't render state, so their reset — and aborting any request the
  // previous file's conversation still had in flight — happens here instead
  // of in the render-time adjustment above.
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
   * Sends the doctor's question to the document agent and streams the reply.
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
        const res = await fetch("/api/document-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: fileId,
            message: question,
            patient_id: String(patientId),
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = (
            leftover + decoder.decode(value, { stream: true })
          ).split("\n");
          leftover = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = parseDocLine(line);
            switch (event.kind) {
              case "text_delta":
                liveRef.current += event.token;
                setLiveText(liveRef.current);
                break;
              case "text_complete":
                flushText(event.content || liveRef.current);
                break;
              case "session_id":
                setSessionId(event.id);
                break;
              case "tool_call":
              case "noop":
                break;
            }
          }
        }

        if (leftover.trim()) {
          const event = parseDocLine(leftover);
          if (event.kind === "text_delta") liveRef.current += event.token;
          if (event.kind === "text_complete")
            flushText(event.content || liveRef.current);
          if (event.kind === "session_id") setSessionId(event.id);
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
    [fileId, patientId, sessionId, isStreaming, flushText],
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
