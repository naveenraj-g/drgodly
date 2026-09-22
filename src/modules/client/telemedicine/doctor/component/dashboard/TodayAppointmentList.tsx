/**
 * TodayAppointmentList — left-panel appointment list for the doctor dashboard.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Renders a scrollable list of today's appointments. Clicking a row selects it
 * and triggers the detail panel to load intake + consultation data.
 *
 * Each row shows:
 *   - Appointment date + start time (e.g. "Sep 10 · 14:30") — the date is
 *     always shown, not just when the range spans multiple days, since a
 *     doctor scanning the list has no other way to tell which day a row
 *     belongs to once the date-range filter is anything wider than "today".
 *   - Patient name (from participant where reference_type === "Patient")
 *   - Appointment type label
 *   - FHIR status badge
 */

"use client";

import { formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE, formatDisplayDayMonth } from "@/modules/shared/helper";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarX } from "lucide-react";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TodayAppointmentListProps {
  /** Appointments for the currently selected date range, sorted by start time. */
  appointments: TAppointmentResponse[];
  /** Currently selected appointment FHIR ID (null = none). */
  selectedId: number | null;
  /** Called when the user clicks an appointment row. */
  onSelect: (id: number) => void;
  /** Empty-state heading — varies with the active date range (e.g. "today" vs a custom range). */
  emptyStateTitle?: string;
  /** Empty-state supporting line. */
  emptyStateDescription?: string;
}

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  fulfilled: {
    label: "Completed",
    className: "bg-emerald-600/10 text-emerald-600 border-emerald-600/20",
  },
  booked: {
    label: "Booked",
    className: "bg-blue-600/10 text-blue-600 border-blue-600/20",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-600/10 text-yellow-700 border-yellow-600/20",
  },
  arrived: {
    label: "Arrived",
    className: "bg-indigo-600/10 text-indigo-600 border-indigo-600/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-600/10 text-rose-600 border-rose-600/20",
  },
  noshow: {
    label: "No-show",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the patient's display name from appointment participants.
 *
 * @param appt - FHIR appointment response.
 */
function getPatientName(appt: TAppointmentResponse): string {
  return (
    appt.participant?.find((p) => p.reference_type === "Patient")
      ?.reference_display ?? "Unknown Patient"
  );
}

/**
 * Formats an ISO datetime to a short HH:MM time string.
 *
 * @param iso - ISO 8601 datetime string.
 */
function formatTime(iso: string): string {
  return formatInTimeZone(new Date(iso), APP_TIMEZONE, "HH:mm");
}

/**
 * Formats an ISO datetime to a short "Mon d" date string (e.g. "Sep 10").
 *
 * @param iso - ISO 8601 datetime string.
 */
function formatShortDate(iso: string): string {
  return formatDisplayDayMonth(iso);
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Scrollable left-panel list of today's appointments.
 * Shows an empty state when no appointments are scheduled.
 *
 * @param appointments - Today's appointment list.
 * @param selectedId - Currently selected FHIR appointment ID.
 * @param onSelect - Selection callback.
 */
export function TodayAppointmentList({
  appointments,
  selectedId,
  onSelect,
  emptyStateTitle = "No appointments today",
  emptyStateDescription = "Your schedule is clear for today.",
}: TodayAppointmentListProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-4">
        <CalendarX className="size-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {emptyStateTitle}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {emptyStateDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    // Plain overflow-y-auto instead of the shadcn/Radix ScrollArea — Radix
    // wraps children in a `display: table` div to measure content, which
    // sizes to the widest row's intrinsic content width instead of the
    // container, breaking `truncate` (text-overflow: ellipsis needs a
    // bounded width) on the patient name / appointment type lines below.
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-1 p-2">
        {appointments.map((appt) => {
          const patientName = getPatientName(appt);
          const time = appt.start ? formatTime(appt.start) : "--:--";
          const date = appt.start ? formatShortDate(appt.start) : null;
          const status = appt.status ?? "pending";
          const statusCfg = STATUS_CONFIG[status] ?? {
            label: status,
            className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
          };
          const isSelected = appt.id === selectedId;

          return (
            <button
              key={appt.id}
              type="button"
              onClick={() => onSelect(appt.id)}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2.5 transition-colors hover:bg-accent",
                isSelected && "bg-accent border border-primary/20",
              )}
            >
              {/* Date + time row */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {date && <span className="font-normal">{date}</span>}
                  {date && " · "}
                  {time}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", statusCfg.className)}
                >
                  {statusCfg.label}
                </Badge>
              </div>

              {/* Patient name */}
              <p className="text-sm font-medium leading-snug truncate">
                {patientName}
              </p>

              {/* Appointment type */}
              {appt.appointment_type_display && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {appt.appointment_type_display}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
