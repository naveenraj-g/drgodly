/**
 * /docs/mobile-guide/voice-consultation — voice intake (raw WebSocket) and
 * video consultation (LiveKit) reference page.
 *
 * Layer: app / docs / mobile-guide
 *
 * Two fundamentally different integration patterns live on this one page
 * because they're both "not a plain HTTP request/response" — a raw
 * WebSocket audio protocol for voice intake, and a full WebRTC session via
 * the LiveKit SDK for video consultations. Neither fits the EndpointCard
 * template the other pages use.
 */

import Link from "next/link";
import { CodeBlock } from "@/modules/client/docs/components/CodeBlock";
import { MethodBadge } from "@/modules/client/docs/components/Badges";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const VOICE_AGENTS = [
  { route: "/api/intake-voice-agent", envVar: "INTAKE_VOICE_AGENT_URL", wsPath: "/ws/audio", usage: "Patient voice-based intake" },
  { route: "/api/consultation-voice-agent", envVar: "CONSULTATION_VOICE_AGENT_URL", wsPath: "/ws/consultaudio", usage: "Patient voice-based AI consultation" },
  { route: "/api/inperson-consultation-agent", envVar: "INPERSON_CONSULTATION_AGENT_URL", wsPath: "/ws/diarize", usage: "Doctor in-person visit transcription/diarization" },
];

export default function VoiceConsultationPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Voice &amp; video consultation</h1>
        <p className="text-sm text-muted-foreground">
          This app has two unrelated real-time integrations: a custom raw-WebSocket audio protocol for
          voice-based intake/consultation, and a LiveKit WebRTC video call for doctor-patient
          consultations. Requires a LiveKit-compatible mobile SDK for the video path (LiveKit publishes
          official iOS, Android, and React Native SDKs).
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Voice intake / consultation (raw WebSocket)</h2>

        <Card>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method="GET" />
              <code className="text-sm font-medium">/api/{"{intake|consultation|inperson-consultation}"}-voice-agent</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Mints a short-lived token and resolves the agent&apos;s WebSocket URL. No request body/params.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Route</th>
                    <th className="px-3 py-1.5 text-left font-medium">Env var</th>
                    <th className="px-3 py-1.5 text-left font-medium">WS path</th>
                    <th className="px-3 py-1.5 text-left font-medium">Used for</th>
                  </tr>
                </thead>
                <tbody>
                  {VOICE_AGENTS.map((v) => (
                    <tr key={v.route} className="border-t">
                      <td className="px-3 py-1.5 font-mono">{v.route}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{v.envVar}</td>
                      <td className="px-3 py-1.5 font-mono">{v.wsPath}</td>
                      <td className="px-3 py-1.5">{v.usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock label="Response" value={{ token: "<Better Auth JWT>", wsUrl: "wss://host/ws/audio" }} />
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              These three routes are still cookie-gated today (same gap as the file-attachment endpoints) —
              flag for a bearer-JWT-gated equivalent before mobile can call them directly.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <p className="text-sm font-medium">Full sequence (voice intake — the other two follow the same shape)</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Call the token route above → <code className="rounded bg-muted px-1 py-0.5">{"{ token, wsUrl }"}</code>.</li>
            <li>Open a WebSocket at <code className="rounded bg-muted px-1 py-0.5">{"${wsUrl}?token=${token}"}</code>, binary mode.</li>
            <li>Capture mic audio at 16kHz, convert to 16-bit PCM, and send each frame as a raw binary WebSocket frame — no JSON envelope for outgoing audio.</li>
            <li>
              Incoming messages are JSON text frames, discriminated by <code className="rounded bg-muted px-1 py-0.5">type</code>:
            </li>
          </ol>

          <div className="space-y-2 pl-5">
            <CodeBlock label='"transcript" — live/growing user speech, not yet committed' value={{ type: "transcript", text: "I've had a head..." }} />
            <CodeBlock label='"text" / "text_delta" — incremental assistant reply text (either may be sent)' value={{ type: "text_delta", text: "How long" }} />
            <CodeBlock label='"assistant_text" — one full, settled assistant turn' value={{ type: "assistant_text", text: "How long have you had this headache?" }} />
            <CodeBlock label='"audio" — TTS playback chunk (base64 PCM-16 LE at 24kHz, may carry a WAV header to strip)' value={{ type: "audio", audio: "<base64>" }} />
            <CodeBlock label='"error"' value={{ type: "error", message: "..." }} />
          </div>

          <p className="text-sm text-muted-foreground">
            On ending the call: build a flattened transcript (<code className="rounded bg-muted px-1 py-0.5">[&quot;patient: ...&quot;, &quot;appointment-intake-agent: ...&quot;]</code>)
            and call the{" "}
            <Link href="/docs/mobile-guide/agents/assessment-plan" className="underline underline-offset-2">Assessment Plan Agent</Link>{" "}
            to build the clinical report, then persist it via{" "}
            <Link href="/docs/mobile-guide/mobile-api" className="underline underline-offset-2">the mobile API&apos;s Intake/create + Intake/update</Link>.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Video consultation (LiveKit WebRTC)</h2>
        <p className="text-sm text-muted-foreground">
          A completely different integration from the voice path above — this needs a real LiveKit SDK
          (iOS/Android/React Native), not raw WebSocket handling.
        </p>

        <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          <li>
            <div className="space-y-1">
              <span>
                <MethodBadge method="POST" /> <code className="rounded bg-muted px-1 py-0.5">/api/livekit-token</code>{" "}
                with <code className="rounded bg-muted px-1 py-0.5">{"{ roomId, name }"}</code> (roomId = Consultation.room_id from{" "}
                <Link href="/docs/mobile-guide/mobile-api" className="underline underline-offset-2">the mobile API</Link>).
              </span>
              <CodeBlock value={{ roomId: "room_AB1C2D", name: "Jane Doe" }} />
              <CodeBlock label="Response" value={{ token: "<LiveKit JWT>", identity: "jane-doe-x7k2" }} />
              <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-700 dark:text-rose-400">
                This route has no auth guard at all today in the web app — worth confirming/hardening before relying on it.
              </p>
            </div>
          </li>
          <li>
            <MethodBadge method="GET" /> <code className="rounded bg-muted px-1 py-0.5">/api/runtime-config</code> →{" "}
            <code className="rounded bg-muted px-1 py-0.5">{"{ livekitUrl: \"wss://...\" }"}</code>.
          </li>
          <li>Connect with the LiveKit SDK using <code className="rounded bg-muted px-1 py-0.5">{"{ token, serverUrl: livekitUrl }"}</code> — the SDK handles audio/video publish and subscribe.</li>
          <li>
            <div className="space-y-1">
              <span>Optional live transcript (works alongside the call):</span>
              <ol className="list-[lower-alpha] space-y-1 pl-5">
                <li>
                  <MethodBadge method="POST" /> <code className="rounded bg-muted px-1 py-0.5">/api/livekit-start-transcriber</code> with{" "}
                  <code className="rounded bg-muted px-1 py-0.5">{"{ roomId }"}</code> — must be called before subscribing, or the stream stays silent.
                </li>
                <li>
                  Subscribe via Server-Sent Events, called directly against the agent (not proxied):{" "}
                  <code className="rounded bg-muted px-1 py-0.5">GET {"{NEXT_PUBLIC_LIVEKIT_AGENT_URL}"}/transcript-stream?roomId={"{roomId}"}</code>.
                  <CodeBlock label="Each SSE message's data" value={{ text: "How have you been feeling?", participantName: "Dr. Smith", timestamp: "2026-01-15T09:00:00Z" }} />
                </li>
              </ol>
            </div>
          </li>
          <li>
            On doctor end-call: persist the merged report via{" "}
            <Link href="/docs/mobile-guide/mobile-api" className="underline underline-offset-2">the mobile API&apos;s Consultation/complete</Link>.
          </li>
        </ol>
      </section>
    </div>
  );
}
