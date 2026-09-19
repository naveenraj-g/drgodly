/**
 * @file DoctorAppointmentCard.tsx
 * @description Grid-view card for one row of the doctor appointments table —
 * rendered by DataTableWithViews' `renderCard` when the doctor switches to
 * card view. Mirrors DoctorAppointmentColumns' cell content and row actions
 * exactly (same fields, same buttons, same conditions) so switching views
 * never hides a capability the table view has.
 * @layer client/telemedicine/doctor/component/appointments/list
 */

"use client";

import type { Row } from "@tanstack/react-table";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Stethoscope,
  Timer,
  User,
  Video,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DataTableRowActions,
  type RowAction,
} from "@/modules/client/shared/components/tables";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import { APPOINTMENT_STATUS_OPTIONS, type DoctorAppointmentColumnCallbacks } from "./DoctorAppointmentColumns";

// ── Status → label/class (mirrors DoctorAppointmentColumns) ─────────────────

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  APPOINTMENT_STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

const STATUS_CLASS: Record<string, string> = {
  proposed: "bg-slate-100 text-slate-700 border-slate-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  booked: "bg-blue-100 text-blue-800 border-blue-200",
  arrived: "bg-teal-100 text-teal-800 border-teal-200",
  fulfilled: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  noshow: "bg-orange-100 text-orange-800 border-orange-200",
  "entered-in-error": "bg-red-200 text-red-900 border-red-300",
  "checked-in": "bg-cyan-100 text-cyan-800 border-cyan-200",
  waitlist: "bg-purple-100 text-purple-800 border-purple-200",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Card rendering for one doctor appointment row.
 *
 * @param row - TanStack row (gives access to `row.original`).
 * @param callbacks - Same action callbacks the columns factory receives.
 */
export function DoctorAppointmentCard({
  row,
  callbacks,
}: {
  row: Row<TAppointmentResponse>;
  callbacks: DoctorAppointmentColumnCallbacks;
}) {
  const appointment = row.original;
  const status = appointment.status;
  const canConfirm = status === "pending";
  const canCancel = status === "booked" || status === "pending";
  const isBooked = status === "booked";
  const canReschedule =
    (status === "pending" || status === "booked") && !!appointment.slot?.length;
  const canOpenClinicalRecords = appointment.subject_id != null;
  const apptType =
    appointment.appointment_type_display ?? appointment.appointment_type_text ?? null;

  const menuActions: RowAction<TAppointmentResponse>[] = [
    {
      label: "Review",
      icon: ClipboardList,
      onClick: () => callbacks.onReview(appointment),
    },
    ...(canOpenClinicalRecords
      ? [
          {
            label: "Clinical Records",
            icon: Stethoscope,
            onClick: () => callbacks.onClinicalRecords(appointment),
          },
        ]
      : []),
    ...(canConfirm
      ? [
          {
            label: "Confirm",
            icon: CheckCircle2,
            onClick: () => callbacks.onConfirm(appointment),
          },
        ]
      : []),
    ...(canReschedule
      ? [
          {
            label: "Reschedule",
            icon: CalendarClock,
            onClick: () => callbacks.onReschedule(appointment),
          },
        ]
      : []),
    ...(canCancel
      ? [{ label: "Cancel", icon: XCircle, onClick: () => callbacks.onCancel(appointment) }]
      : []),
  ];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-2.5 px-4 py-3">
        {/* Patient + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
            <User className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{appointment.subject_display ?? "—"}</span>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs font-normal ${STATUS_CLASS[status ?? ""] ?? ""}`}
          >
            {STATUS_LABEL[status ?? ""] ?? status ?? "Unknown"}
          </Badge>
        </div>

        {/* Date + time + duration */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3 shrink-0" />
            {formatDate(appointment.start)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3 shrink-0" />
            {formatTime(appointment.start)}
          </span>
          {appointment.minutes_duration != null && (
            <span className="flex items-center gap-1.5">
              <Timer className="size-3 shrink-0" />
              {appointment.minutes_duration} min
            </span>
          )}
        </div>

        {/* Type */}
        {apptType && (
          <div className="text-xs text-muted-foreground truncate">{apptType}</div>
        )}

        {/* Actions — mt-auto pins them to the card bottom */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t pt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => callbacks.onView(appointment)}
          >
            <Eye className="size-3 mr-1" />
            View
          </Button>
          {isBooked && (
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2 text-xs"
              onClick={() => callbacks.onConsult(appointment)}
            >
              <Video className="size-3 mr-1" />
              Join
            </Button>
          )}
          {isBooked && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => callbacks.onInPersonConsult(appointment)}
            >
              <Stethoscope className="size-3 mr-1" />
              In-Person
            </Button>
          )}
          <DataTableRowActions row={row} actions={menuActions} />
        </div>
      </CardContent>
    </Card>
  );
}
