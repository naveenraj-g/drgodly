/**
 * VoiceIntake — patient-facing voice intake component powered by Vapi AI.
 *
 * Layer: client / telemedicine / patient / intake
 *
 * Flow:
 *  1. On mount: createIntakeAction → receives intake id.
 *  2. Patient clicks "Start" → Vapi.start(agentId) begins the call.
 *  3. Transcript events build the conversation array in real time.
 *  4. Patient clicks "End Call" (or call ends naturally):
 *     a. updateIntakeAction(id, conversation) — no report for voice.
 *     b. Opens IntakeCompleteModal with the intake id.
 *
 * Vapi handles all STT, TTS, and LLM — no external agent proxy needed.
 * Env vars: NEXT_PUBLIC_VAPI_PUBLIC_KEY, NEXT_PUBLIC_VAPI_AGENT_ID.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Loader2, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createIntakeAction, updateIntakeAction } from "@/modules/server/presentation/actions/intake";
import { IntakeCompleteModal } from "./IntakeCompleteModal";
import type { TIntakeMessage } from "@/modules/entities/schemas/intake";

/** Vapi environment keys (public — safe to expose to the browser). */
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
const VAPI_AGENT_ID = process.env.NEXT_PUBLIC_VAPI_AGENT_ID ?? "";

/** Vapi call status labels shown in the UI. */
type CallStatus = "idle" | "connecting" | "active" | "ending";

/** Props for VoiceIntake. */
interface VoiceIntakeProps {
  /** FHIR Patient.id — passed to createIntakeAction for doctor cross-reference. */
  patientFhirId?: number;
  /** Locale-prefixed base path for post-intake navigation. */
  basePath: string;
}

/**
 * Voice-based patient intake using Vapi AI.
 *
 * Imports Vapi dynamically to avoid SSR issues (the Vapi SDK uses browser APIs).
 *
 * @param patientFhirId - Optional FHIR Patient.id.
 * @param basePath - Locale-prefixed base path.
 */
export function VoiceIntake({ patientFhirId, basePath }: VoiceIntakeProps) {
  const [intakeId, setIntakeId] = useState<number | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<TIntakeMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);

  // ── Create intake session on mount ────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [data, err] = await createIntakeAction({
        payload: {
          userId: "", // injected server-side
          mode: "VOICE",
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

    // Cleanup: end the call if the component unmounts mid-session
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      vapiRef.current?.stop();
    };
  }, [patientFhirId]);

  // ── Start Vapi call ───────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (!intakeId || !VAPI_PUBLIC_KEY || !VAPI_AGENT_ID) {
      toast.error("Voice intake is not configured");
      return;
    }

    setCallStatus("connecting");

    // Dynamic import to avoid SSR crash (Vapi uses browser APIs)
    const { default: Vapi } = await import("@vapi-ai/web").catch(() => {
      toast.error("Failed to load voice library");
      setCallStatus("idle");
      return { default: null };
    });
    if (!Vapi) return;

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => setCallStatus("active"));
    vapi.on("call-end", () => endCall());
    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));
    vapi.on("error", (err: unknown) => {
      console.error("[Vapi error]", err);
      toast.error("Voice call error — please try again");
      setCallStatus("idle");
    });

    // Collect transcript turns as they finalise
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on("message", (msg: any) => {
      if (msg.type === "transcript" && msg.transcriptType === "final") {
        const role = msg.role === "user" ? "user" : "assistant";
        setMessages((prev) => [...prev, { role, content: msg.transcript }]);
      }
    });

    vapi.start(VAPI_AGENT_ID);
  }, [intakeId]);

  // ── End call: save intake → show modal ───────────────────────────────────
  const endCall = useCallback(async () => {
    if (callStatus === "ending" || !intakeId) return;
    setCallStatus("ending");
    vapiRef.current?.stop();

    const [, err] = await updateIntakeAction({
      payload: {
        id: intakeId,
        // Use latest messages state; no report for voice (Vapi handles it)
        conversation: messages,
      },
    });

    if (err) {
      toast.error("Failed to save intake");
      setCallStatus("idle");
      return;
    }

    setShowModal(true);
  }, [callStatus, intakeId, messages]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const statusLabel: Record<CallStatus, string> = {
    idle: "Ready",
    connecting: "Connecting…",
    active: "In Call",
    ending: "Ending…",
  };

  return (
    <>
      <div className="flex flex-col items-center gap-8 py-8">
        {/* Status badge */}
        <Badge
          variant={callStatus === "active" ? "default" : "secondary"}
          className="text-xs"
        >
          {statusLabel[callStatus]}
        </Badge>

        {/* Avatar + pulse animation */}
        <div className="relative">
          <div
            className={cn(
              "size-28 rounded-full flex items-center justify-center bg-primary/10 transition-all duration-300",
              isSpeaking && "ring-4 ring-primary/40 ring-offset-2 scale-105",
            )}
          >
            <Avatar className="size-20">
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                AI
              </AvatarFallback>
            </Avatar>
          </div>
          {isSpeaking && (
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
          )}
        </div>

        {/* Call controls */}
        {callStatus === "idle" && (
          <Button
            size="lg"
            onClick={startCall}
            disabled={!intakeId}
            className="rounded-full px-8"
          >
            <Mic className="size-5 mr-2" />
            Start Voice Intake
          </Button>
        )}

        {callStatus === "connecting" && (
          <Button size="lg" disabled className="rounded-full px-8">
            <Loader2 className="size-5 mr-2 animate-spin" />
            Connecting…
          </Button>
        )}

        {callStatus === "active" && (
          <Button
            size="lg"
            variant="destructive"
            onClick={endCall}
            className="rounded-full px-8"
          >
            <PhoneOff className="size-5 mr-2" />
            End Call
          </Button>
        )}

        {callStatus === "ending" && (
          <Button size="lg" disabled className="rounded-full px-8">
            <Loader2 className="size-5 mr-2 animate-spin" />
            Saving…
          </Button>
        )}

        {/* Live transcript */}
        {messages.length > 0 && (
          <div className="w-full max-w-lg">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Transcript
            </p>
            <ScrollArea className="h-52 border rounded-lg px-4 py-3 bg-muted/30">
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-semibold shrink-0 mt-0.5 uppercase",
                        msg.role === "user" ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {msg.role === "user" ? "You" : "AI"}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {callStatus === "idle" && (
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            The AI will guide you through a clinical intake. Speak naturally —
            describe your symptoms, medical history, and concerns.
          </p>
        )}

        {/* Microphone permission hint */}
        {callStatus !== "idle" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MicOff className="size-3" />
            <span>Ensure your microphone is enabled</span>
          </div>
        )}
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
