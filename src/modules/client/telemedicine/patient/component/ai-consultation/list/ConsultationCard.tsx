/**
 * @file ConsultationCard.tsx
 * @description Grid-view card for one row of the patient AI Consultation
 * list — rendered by DataTableWithViews' `renderCard` when the patient
 * switches to card view. Mirrors ConsultationColumns' cell content exactly.
 * @layer client/telemedicine/patient/ai-consultation/list
 */

"use client";

import { Eye } from "lucide-react";
import { formatDisplayDate } from "@/modules/shared/helper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TConsultationListItem } from "@/modules/entities/schemas/consultation";

// ── Status → label/class (mirrors ConsultationColumns) ──────────────────────

const STATUS_LABEL: Record<string, string> = {
  WAITING: "Waiting",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
};

const STATUS_CLASS: Record<string, string> = {
  WAITING: "bg-amber-100 text-amber-800 border-amber-200",
  ACTIVE: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  ABANDONED: "bg-red-100 text-red-800 border-red-200",
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return formatDisplayDate(d);
}

/**
 * Card rendering for one AI Consultation row.
 *
 * @param consultation - The consultation list item to render.
 * @param onView - Navigates to the linked appointment detail page.
 */
export function ConsultationCard({
  consultation,
  onView,
}: {
  consultation: TConsultationListItem;
  onView: (row: TConsultationListItem) => void;
}) {
  const status = consultation.status;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-2.5 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums">
            Consultation #{consultation.id}
          </span>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs font-normal ${STATUS_CLASS[status ?? ""] ?? ""}`}
          >
            {STATUS_LABEL[status ?? ""] ?? status ?? "Unknown"}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Appointment #{consultation.fhir_appointment_id}
        </div>

        <div className="font-mono text-xs text-muted-foreground truncate">
          Room: {consultation.room_id}
        </div>

        <div className="text-xs text-muted-foreground">
          {formatDate(consultation.created_at)}
        </div>

        <div className="mt-auto border-t pt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => onView(consultation)}
          >
            <Eye className="size-3 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
