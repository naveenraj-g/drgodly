/**
 * @file IntakeCard.tsx
 * @description Grid-view card for one row of the patient AI Intake list —
 * rendered by DataTableWithViews' `renderCard` when the patient switches to
 * card view. Mirrors IntakeColumns' cell content exactly.
 * @layer client/telemedicine/patient/ai-intake/list
 */

"use client";

import { Eye, MessageSquare, Mic } from "lucide-react";
import { formatDisplayDate } from "@/modules/shared/helper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type TIntakeResponse } from "@/modules/entities/schemas/intake";

// ── Status → label/class (mirrors IntakeColumns) ─────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
};

const STATUS_CLASS: Record<string, string> = {
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  ABANDONED: "bg-red-100 text-red-800 border-red-200",
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return formatDisplayDate(d);
}

/**
 * Card rendering for one AI Intake row.
 *
 * @param intake - The intake record to render.
 * @param onView - Navigates to the linked appointment (if any).
 */
export function IntakeCard({
  intake,
  onView,
}: {
  intake: TIntakeResponse;
  onView: (row: TIntakeResponse) => void;
}) {
  const status = intake.status;
  const risk = intake.report?.risk_level;
  const riskClass = risk
    ? risk.toLowerCase() === "high"
      ? "bg-red-100 text-red-800 border-red-200"
      : risk.toLowerCase() === "medium"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-green-100 text-green-800 border-green-200"
    : "";

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-2.5 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums">
            Intake #{intake.id}
          </span>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs font-normal ${STATUS_CLASS[status ?? ""] ?? ""}`}
          >
            {STATUS_LABEL[status ?? ""] ?? status ?? "Unknown"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1">
            {intake.mode === "VOICE" ? (
              <Mic className="size-3" />
            ) : (
              <MessageSquare className="size-3" />
            )}
            {intake.mode === "VOICE" ? "Voice" : "Text"}
          </Badge>
          {risk && (
            <Badge variant="outline" className={`capitalize ${riskClass}`}>
              {risk} risk
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {intake.fhir_appointment_id
            ? `Appointment #${intake.fhir_appointment_id}`
            : "No linked appointment"}
        </div>

        <div className="text-xs text-muted-foreground">
          {formatDate(intake.created_at)}
        </div>

        <div className="mt-auto border-t pt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => onView(intake)}
          >
            <Eye className="size-3 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
