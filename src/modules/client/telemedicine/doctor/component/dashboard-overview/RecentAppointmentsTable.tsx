/**
 * RecentAppointmentsTable — practice-overview widget showing the 5 most
 * recent appointments for this practitioner.
 *
 * Layer: client / telemedicine / doctor / component / dashboard-overview
 *
 * A lightweight, non-paginated table (date, patient, type, status). Mirrors
 * the patient portal's RecentAppointmentsTable, but shows the patient name
 * instead of the doctor name — the natural doctor-side equivalent.
 */

"use client";

import { formatDisplayDayMonth, formatDisplayTime } from "@/modules/shared/helper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal appointment record needed for this widget. */
export interface DashboardAppointment {
  id: number;
  /** ISO datetime string, e.g. "2026-06-15T09:30:00Z". */
  date?: string | null;
  /** Appointment type label, e.g. "Routine appointment". */
  type?: string | null;
  /** Patient display name derived from participants. */
  patientName?: string | null;
  /** FHIR appointment status code. */
  status?: string | null;
}

interface RecentAppointmentsTableProps {
  /** Up to 5 appointments to render. */
  appointments: DashboardAppointment[];
  /** Base href for the doctor's full appointments list ("See all" link). */
  viewAllHref: string;
}

// ── Status badge config (mirrors DoctorAppointmentColumns' STATUS_CLASS) ─────

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
    className: "bg-amber-600/10 text-amber-700 border-amber-600/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-600/10 text-rose-600 border-rose-600/20",
  },
  noshow: {
    label: "No-show",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  arrived: {
    label: "Arrived",
    className: "bg-indigo-600/10 text-indigo-600 border-indigo-600/20",
  },
};

/**
 * Returns a localised date + time string for display in the table.
 *
 * @param iso - ISO 8601 datetime string.
 * @returns Human-readable date/time, e.g. "Jun 15, 9:30 AM".
 */
function formatDateTime(iso: string): string {
  return `${formatDisplayDayMonth(iso)}, ${formatDisplayTime(iso)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a compact table of recent appointments with status badges.
 * Shows an empty state when the array is empty.
 *
 * @param appointments - Array of up to 5 appointment records.
 * @param viewAllHref - "See all" link target.
 */
export function RecentAppointmentsTable({
  appointments,
  viewAllHref,
}: RecentAppointmentsTableProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Recent Appointments</h2>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-xs h-auto p-0 font-normal opacity-70 hover:opacity-100 hover:bg-transparent hover:underline"
        >
          <Link href={viewAllHref}>See all</Link>
        </Button>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No appointments yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appt) => {
              const statusCfg = STATUS_CONFIG[appt.status ?? ""] ?? {
                label: appt.status ?? "Unknown",
                className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
              };

              return (
                <TableRow key={appt.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {appt.date ? formatDateTime(appt.date) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {appt.patientName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-40">
                    {appt.type ?? "Consultation"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusCfg.className)}
                    >
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
