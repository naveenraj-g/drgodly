/**
 * @file VideoConsultPanel.tsx
 * @description The one real piece of the oc-demo prototype — a genuine
 * LiveKit video call, custom-styled to match the reference design's
 * main-tile + self-view-inset layout (not the shared RoomControlUI's equal
 * grid, which doesn't match this design). Joins a fixed demo room via the
 * same /api/livekit-token + /api/runtime-config endpoints the real
 * DoctorConsult/PatientConsult pages use — no appointment/patient/
 * consultation record is required, since this room isn't tied to any FHIR
 * data.
 *
 * To see two participants like the reference image, open this page in a
 * second browser tab/window — LiveKit needs a real second participant to
 * populate the main tile; solo, you'll only see your own camera.
 * @layer client/telemedicine/doctor/component/oc-demo
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  ConnectionStateToast,
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  isTrackReference,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { toast } from "sonner";
import {
  Loader2,
  Maximize,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  ScreenShare,
  Video,
  VideoOff,
} from "lucide-react";
import { MOCK_DOCTOR, MOCK_PATIENT } from "./mockOcData";

/** Fixed so opening this page in two tabs/windows joins the same room. */
const DEMO_ROOM_ID = "oc-demo-room";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formats elapsed seconds as MM:SS. */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VideoConsultPanelProps {
  /** Reflects the real LiveKit connection state up to the patient header bar. */
  onConnectedChange: (connected: boolean) => void;
  /** Bump this (e.g. ++) from outside to trigger a disconnect — lets the
   *  header's "End Visit" button hang up the same room this panel owns. */
  endSignal: number;
}

/**
 * Fetches a LiveKit token/URL for the fixed demo room and renders the call
 * once connected.
 */
export function VideoConsultPanel({ onConnectedChange, endSignal }: VideoConsultPanelProps) {
  const [token, setToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: DEMO_ROOM_ID, name: MOCK_DOCTOR.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Token request failed");
        setToken(data.token);
      } catch {
        toast.error("Failed to connect to the consultation room");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/runtime-config", { cache: "no-store" });
        if (!res.ok) throw new Error("runtime-config failed");
        const data = await res.json();
        setLivekitUrl(data.livekitUrl);
      } catch {
        toast.error("Failed to load LiveKit config");
      }
    })();
  }, []);

  if (!token || !livekitUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-zinc-950">
        <p className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <Loader2 className="size-4 animate-spin" /> Connecting to consultation…
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video
      audio
      token={token}
      serverUrl={livekitUrl}
      className="!h-full !bg-transparent"
      onConnected={() => onConnectedChange(true)}
      onDisconnected={() => onConnectedChange(false)}
    >
      <VideoRoomBody endSignal={endSignal} />
    </LiveKitRoom>
  );
}

// ── Room body (rendered inside <LiveKitRoom>) ────────────────────────────────

function VideoRoomBody({ endSignal }: { endSignal: number }) {
  const room = useRoomContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);

  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });
  const remoteTrack = tracks.find((t) => !t.participant.isLocal);
  const localTrack = tracks.find((t) => t.participant.isLocal);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // The header's "End Visit" button lives outside this LiveKitRoom subtree,
  // so it signals a disconnect by bumping this prop rather than calling
  // room.disconnect() directly.
  const lastEndSignal = useRef(endSignal);
  useEffect(() => {
    if (endSignal !== lastEndSignal.current) {
      lastEndSignal.current = endSignal;
      room.disconnect();
    }
  }, [endSignal, room]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl bg-zinc-950"
    >
      <RoomAudioRenderer />
      <ConnectionStateToast />

      {/* Main tile — the other participant, or your own camera while alone */}
      {remoteTrack ? (
        <CameraTile trackRef={remoteTrack} label={MOCK_PATIENT.name} />
      ) : localTrack ? (
        <CameraTile trackRef={localTrack} label={MOCK_DOCTOR.name} />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-400">
          Waiting for the other participant to join — open this page in a
          second tab/window to test a real two-person call.
        </div>
      )}

      {/* Timer */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
        <span className="size-1.5 rounded-full bg-green-500" />
        {formatElapsed(elapsed)}
      </div>

      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label="Toggle fullscreen"
        className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
      >
        <Maximize className="size-3.5" />
      </button>

      {/* Self-view inset — only once someone else is actually in the main tile */}
      {remoteTrack && localTrack && (
        <div className="absolute top-3 right-14 aspect-video w-28 overflow-hidden rounded-lg border-2 border-white/20 shadow-lg">
          <CameraTile trackRef={localTrack} label={MOCK_DOCTOR.name} compact />
        </div>
      )}

      {/* Bottom-left name label on the main tile */}
      <span className="absolute bottom-16 left-3 rounded bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
        {remoteTrack ? MOCK_PATIENT.name : MOCK_DOCTOR.name}
      </span>

      {/* Controls */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
        <button
          type="button"
          aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
          onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          className={`flex size-9 items-center justify-center rounded-full text-white ${
            isMicrophoneEnabled ? "hover:bg-white/10" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isMicrophoneEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </button>
        <button
          type="button"
          aria-label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
          className={`flex size-9 items-center justify-center rounded-full text-white ${
            isCameraEnabled ? "hover:bg-white/10" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isCameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </button>
        <button
          type="button"
          aria-label="Share screen"
          onClick={() =>
            toast.info("Screen share is a placeholder in this design prototype.")
          }
          className="flex size-9 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <ScreenShare className="size-4" />
        </button>
        <button
          type="button"
          aria-label="More options"
          onClick={() =>
            toast.info("More options is a placeholder in this design prototype.")
          }
          className="flex size-9 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <MoreHorizontal className="size-4" />
        </button>
        <button
          type="button"
          aria-label="End call"
          onClick={() => room.disconnect()}
          className="flex size-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
        >
          <PhoneOff className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Camera tile ───────────────────────────────────────────────────────────────

/**
 * Renders one participant's camera feed, or a name-initial placeholder when
 * their camera track is off — `useTracks(..., { withPlaceholder: true })`
 * returns a placeholder entry (no real published track) in that case, which
 * `VideoTrack` itself can't render.
 */
function CameraTile({
  trackRef,
  label,
  compact = false,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      {isTrackReference(trackRef) ? (
        <VideoTrack trackRef={trackRef} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-800">
          <span
            className={
              compact
                ? "flex size-8 items-center justify-center rounded-full bg-zinc-600 text-xs font-semibold text-white"
                : "flex size-16 items-center justify-center rounded-full bg-zinc-600 text-xl font-semibold text-white"
            }
          >
            {label
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </span>
        </div>
      )}
      {compact && (
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          {label}
        </span>
      )}
    </div>
  );
}
