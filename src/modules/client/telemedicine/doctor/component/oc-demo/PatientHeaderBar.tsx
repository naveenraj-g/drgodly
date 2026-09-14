/**
 * @file PatientHeaderBar.tsx
 * @description Patient identity + visit status bar for the oc-demo page —
 * avatar, name/demographics, status badges, visit date/duration, live
 * connection indicator, and the "End Visit" button.
 * @layer client/telemedicine/doctor/component/oc-demo
 */

"use client";

import { CalendarDays, SignalHigh } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_PATIENT } from "./mockOcData";

interface PatientHeaderBarProps {
  /** True while the LiveKit room is connected — drives the connection pill. */
  connected: boolean;
  /** Ends the call — shared with the video panel's own hang-up control. */
  onEndVisit: () => void;
}

/**
 * Renders the patient identity/status bar at the top of the consultation page.
 *
 * @param connected - Whether the video call is currently connected.
 * @param onEndVisit - Called when "End Visit" is clicked.
 */
export function PatientHeaderBar({ connected, onEndVisit }: PatientHeaderBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback
            className="font-semibold text-foreground/80"
            style={{ backgroundColor: "#fda4af" }}
          >
            {MOCK_PATIENT.name
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold">{MOCK_PATIENT.name}</h1>
            <span className="text-sm text-muted-foreground">
              {MOCK_PATIENT.gender} | {MOCK_PATIENT.age} yrs | ID: {MOCK_PATIENT.patientCode}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200" variant="outline">
              {MOCK_PATIENT.badges[0]}
            </Badge>
            <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
              {MOCK_PATIENT.visitType}
            </Badge>
            {MOCK_PATIENT.badges.slice(1).map((badge) => (
              <Badge
                key={badge}
                className="bg-violet-100 text-violet-700 border-violet-200"
                variant="outline"
              >
                {badge}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <CalendarDays className="size-4 text-muted-foreground" />
          <div className="leading-tight">
            <div className="font-medium">{MOCK_PATIENT.visitDate}</div>
            <div className="text-xs text-muted-foreground">{MOCK_PATIENT.visitTime}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm">
          <SignalHigh className={connected ? "size-4 text-green-600" : "size-4 text-muted-foreground"} />
          <div className="leading-tight">
            <div className={connected ? "font-medium text-green-600" : "font-medium text-muted-foreground"}>
              {connected ? "Connected" : "Connecting…"}
            </div>
            <div className="text-xs text-muted-foreground">HD Quality</div>
          </div>
        </div>

        <Button variant="destructive" onClick={onEndVisit}>
          End Visit
        </Button>
      </div>
    </div>
  );
}
