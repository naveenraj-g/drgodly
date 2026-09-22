/**
 * @file PatientSummaryCard.tsx
 * @description Grid-view card for one row of the doctor's Clinical Records
 * patient list (PatientListTable) — rendered by DataTableWithViews'
 * `renderCard` when the doctor switches to card view. Mirrors the table
 * columns exactly: name, visit/completed/upcoming counts, last visit date.
 * @layer client/telemedicine/doctor/component/clinical-records
 */

"use client";

import Link from "next/link";
import { formatDisplayDate } from "@/modules/shared/helper";
import { ChevronRight, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DoctorPatientSummary } from "./types";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDisplayDate(iso);
  } catch {
    return "—";
  }
}

/**
 * Card rendering for one patient summary row. The whole card is a link,
 * same destination as the table row's "Open" button.
 *
 * @param patient - The patient summary to render.
 * @param baseHref - Base path this card links under, e.g. ".../clinical-records".
 */
export function PatientSummaryCard({
  patient,
  baseHref,
}: {
  patient: DoctorPatientSummary;
  baseHref: string;
}) {
  return (
    <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
      <Link href={`${baseHref}/${patient.patientId}`} className="block h-full">
        <CardContent className="flex h-full flex-col gap-2.5 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium truncate">{patient.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                Patient/{patient.patientId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{patient.visitCount}</span>{" "}
              appointments
            </span>
            <Badge variant="secondary" className="font-normal tabular-nums">
              {patient.completedCount} completed
            </Badge>
            {patient.upcomingCount > 0 && (
              <Badge className="font-normal tabular-nums">
                {patient.upcomingCount} upcoming
              </Badge>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-1.5 border-t pt-2.5 text-xs text-muted-foreground">
            <span>Last visit: {fmtDate(patient.lastVisit)}</span>
            <ChevronRight className="size-4 shrink-0" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
