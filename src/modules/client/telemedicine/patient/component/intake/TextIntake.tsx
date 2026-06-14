/**
 * TextIntake — patient-facing text chat intake component.
 *
 * Layer: client / telemedicine / patient / intake
 *
 * Flow:
 *  1. On mount: createIntakeAction → receives intake id.
 *  2. Patient types messages → streamed to /api/intake-agent → replies appended.
 *  3. "End Chat" button:
 *     a. POST conversation to /api/assessment-plan-agent → get report.
 *     b. updateIntakeAction(id, conversation, report) → status=COMPLETED.
 *     c. Opens IntakeCompleteModal with the intake id.
 *
 * The sessionId for the external agent is the intake id stringified, giving
 * per-intake conversation isolation without extra state.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Send, Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createIntakeAction, updateIntakeAction } from "@/modules/server/presentation/actions/intake";
import { IntakeCompleteModal } from "./IntakeCompleteModal";
import type { TIntakeMessage } from "@/modules/entities/schemas/intake";

/** Props for TextIntake. */
interface TextIntakeProps {
  /** FHIR Patient.id — passed to createIntakeAction for doctor cross-reference. */
  patientFhirId?: number;
  /** Locale-prefixed base path for post-intake navigation. */
  basePath: string;
}

/**
 * Text-based patient intake chat.
 *
 * Streams AI responses from /api/intake-agent. Generates a clinical report
 * from /api/assessment-plan-agent on completion and persists everything via
 * server actions.
 *
 * @param patientFhirId - Optional FHIR Patient.id for cross-reference.
 * @param basePath - Locale-prefixed base path (e.g. "/en/bezs/telemedicine/patient").
 */
export function TextIntake({ patientFhirId, basePath }: TextIntakeProps) {
  const [intakeId, setIntakeId] = useState<number | null>(null);
  const [messages, setMessages] = useState<TIntakeMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Create intake session on mount ────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [data, err] = await createIntakeAction({
        payload: {
          userId: "", // injected server-side from session
          mode: "TEXT",
          patient_fhir_id: patientFhirId,
        },
      });
      if (err) {
        toast.error("Failed to start intake session");
        return;
      }
      setIntakeId(data!.id);
    }
    init();
  }, [patientFhirId]);

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || !intakeId) return;

    const userMessage: TIntakeMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/intake-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: String(intakeId) }),
      });

      if (!response.ok || !response.body) {
        toast.error("Agent unavailable, please try again");
        setIsStreaming(false);
        return;
      }

      // Stream the response token-by-token
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      // Seed an empty assistant bubble so it fills in progressively
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });

        // Update the last (assistant) message in place
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch {
      toast.error("Connection error, please try again");
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, isStreaming, intakeId]);

  // Allow Enter to send (Shift+Enter for newline not needed — single-line input)
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── End chat: generate report → save → show modal ─────────────────────────
  const endChat = useCallback(async () => {
    if (!intakeId || messages.length === 0 || isEnding) return;
    setIsEnding(true);

    try {
      // 1. Generate clinical assessment report
      let report: Record<string, unknown> | undefined;
      try {
        const reportRes = await fetch("/api/assessment-plan-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation: messages }),
        });
        if (reportRes.ok) report = await reportRes.json();
      } catch {
        // Non-fatal — save without report if agent is unavailable
      }

      // 2. Persist conversation + report
      const [, err] = await updateIntakeAction({
        payload: { id: intakeId, conversation: messages, report },
      });

      if (err) {
        toast.error("Failed to save intake — please try again");
        return;
      }

      setShowModal(true);
    } finally {
      setIsEnding(false);
    }
  }, [intakeId, messages, isEnding]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col h-full max-h-[calc(100vh-12rem)] border rounded-xl overflow-hidden bg-background shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">AI Intake Assistant</p>
            <p className="text-xs text-muted-foreground">
              Describe your symptoms and medical history
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={endChat}
            disabled={isEnding || messages.length === 0 || !intakeId}
          >
            {isEnding ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <StopCircle className="size-4 mr-1.5" />
            )}
            {isEnding ? "Saving…" : "End Chat"}
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              Start by describing your main concern or symptoms.
            </div>
          )}
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" && "flex-row-reverse",
                )}
              >
                {/* Avatar */}
                <Avatar className="size-7 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] font-semibold">
                    {msg.role === "user" ? "You" : "AI"}
                  </AvatarFallback>
                </Avatar>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm",
                  )}
                >
                  {msg.content || (
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce">·</span>
                      <span className="animate-bounce delay-100">·</span>
                      <span className="animate-bounce delay-200">·</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div ref={bottomRef} />
        </ScrollArea>

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t bg-muted/20">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            disabled={isStreaming || isEnding || !intakeId}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || isEnding || !intakeId}
          >
            {isStreaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Post-intake modal */}
      {showModal && intakeId && (
        <IntakeCompleteModal
          open={showModal}
          intakeId={intakeId}
          basePath={basePath}
        />
      )}
    </>
  );
}
