/**
 * @file OcDemo.tsx
 * @description Visual-redesign prototype of the online-consultation screen —
 * a design reference kept on its own route (/doctor/oc-demo), separate from
 * the real DoctorConsult page. Every panel except the video tile is static
 * mock data (see mockOcData.ts); the video tile is a genuine LiveKit room
 * (see VideoConsultPanel.tsx) — no appointment/patient/consultation record
 * is required to test it.
 * @layer client/telemedicine/doctor/component/oc-demo
 */

"use client";

import { useState } from "react";
import { PatientHeaderBar } from "./PatientHeaderBar";
import { PatientSummaryPanel } from "./PatientSummaryPanel";
import { VideoConsultPanel } from "./VideoConsultPanel";
import { ConsultTabsPanel } from "./ConsultTabsPanel";
import { ClinicalSupportPanel } from "./ClinicalSupportPanel";
import { BottomActionBar } from "./BottomActionBar";

/** Top-level layout for the online-consultation demo page. */
export function OcDemo() {
  const [connected, setConnected] = useState(false);
  const [endSignal, setEndSignal] = useState(0);

  return (
    <div className="space-y-4">
      <PatientHeaderBar
        connected={connected}
        onEndVisit={() => setEndSignal((s) => s + 1)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_360px] gap-4 items-start">
        {/* ── Left: patient summary ── */}
        <div className="min-w-0">
          <PatientSummaryPanel />
        </div>

        {/* ── Center: video + transcript/chat tabs ── */}
        <div className="min-w-0 flex flex-col gap-3">
          <div className="h-[420px] shrink-0">
            <VideoConsultPanel onConnectedChange={setConnected} endSignal={endSignal} />
          </div>
          <div className="flex-1 min-h-[360px]">
            <ConsultTabsPanel />
          </div>
        </div>

        {/* ── Right: clinical decision support ── */}
        <div className="min-w-0">
          <ClinicalSupportPanel />
        </div>
      </div>

      <BottomActionBar />
    </div>
  );
}
