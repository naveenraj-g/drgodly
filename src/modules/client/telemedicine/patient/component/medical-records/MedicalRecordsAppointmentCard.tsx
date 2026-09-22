/**
 * @file MedicalRecordsAppointmentCard.tsx
 * @description Grid-view card for one row of the Medical Records appointment
 * picker — rendered by DataTableWithViews' `renderCard` when the patient
 * switches to card view. Mirrors MedicalRecordsAppointmentColumns' cell
 * content exactly so switching views never hides information the table view has.
 * @layer client/telemedicine/patient/component/medical-records
 */

"use client";

import type { Row } from "@tanstack/react-table";
import { formatDisplayDate, formatDisplayTime } from "@/modules/shared/helper";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Stethoscope,
  Timer,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import {
  getDoctorName,
  type MedicalRecordsAppointmentColumnCallbacks,
} from "./MedicalRecordsAppointmentColumns";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatDisplayDate(iso);
}

function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return formatDisplayTime(iso);
}

function formatDuration(
  start: string | null | undefined,
  end: string | null | undefined,
  minutesDuration: number | null | undefined,
): string | null {
  let mins: number | null = null;

  if (start && end) {
    try {
      mins = Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) / 60000,
      );
    } catch {
      /* ignore */
    }
  }

  if (mins == null && minutesDuration != null) mins = minutesDuration;
  if (mins == null || mins <= 0) return null;

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/**
 * Card rendering for one Medical Records appointment row.
 *
 * @param row - TanStack row (gives access to `row.original`).
 * @param callbacks - Same action callbacks the columns factory receives.
 */
export function MedicalRecordsAppointmentCard({
  row,
  callbacks,
}: {
  row: Row<TAppointmentResponse>;
  callbacks: MedicalRecordsAppointmentColumnCallbacks;
}) {
  const appt = row.original;
  const doctorName = getDoctorName(appt.participant);
  // Card view has no per-column visibility UI of its own, but it should
  // still respect the toolbar's column-visibility toggle (e.g. "Type" is
  // hidden by default) rather than always showing every field regardless.
  const isTypeColumnVisible =
    row.getVisibleCells().findIndex((c) => c.column.id === "appointment_type") !== -1;
  const apptType = isTypeColumnVisible
    ? (appt.appointment_type_display ?? appt.appointment_type_text ?? null)
    : null;
  const startTime = formatTime(appt.start);
  const endTime = formatTime(appt.end);
  const duration = formatDuration(appt.start, appt.end, appt.minutes_duration);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-2.5 px-4 py-3">
        {/* Date + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="size-3.5 text-primary shrink-0" />
            {formatDate(appt.start)}
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs font-normal">
            Completed
          </Badge>
        </div>

        {/* Time + duration */}
        {(startTime ?? duration) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {startTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3 shrink-0" />
                {endTime ? `${startTime} – ${endTime}` : startTime}
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-1.5">
                <Timer className="size-3 shrink-0" />
                {duration}
              </span>
            )}
          </div>
        )}

        {/* Doctor */}
        {doctorName !== "—" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="size-3 shrink-0" />
            {doctorName}
          </div>
        )}

        {/* Type */}
        {apptType && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Stethoscope className="size-3 shrink-0" />
            {apptType}
          </div>
        )}

        {/* Action — mt-auto pins it to the card bottom */}
        <div className="mt-auto flex items-center border-t pt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs w-full justify-center"
            onClick={() => callbacks.onSelect(appt)}
          >
            View Orders
            <ChevronRight className="size-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
