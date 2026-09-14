/**
 * @file AppointmentDemoColumns.tsx
 * @description Column definitions for the appointment-demo page's per-tab
 * TanStack Table instances — mirrors DoctorAppointmentColumns.tsx's factory
 * pattern (callbacks injected, columns stay pure) but with the reference
 * design's cell styling (avatar + patient info, visit-type icon, reason/note
 * two-liner, coarse status badge).
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  DataTableColumnHeader,
  DataTableRowActions,
  type RowAction,
} from "@/modules/client/shared/components/tables";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Video } from "lucide-react";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import { APPOINTMENT_STATUS_OPTIONS } from "@/modules/client/telemedicine/doctor/component/appointments/list/DoctorAppointmentColumns";
import {
  avatarColorFor,
  initialsFor,
  isTelemedicine,
  noteLine,
  patientAge,
  patientGenderLabel,
  reasonLine,
  toCoarseStatus,
  type CoarseStatus,
} from "./appointmentDisplay";

// ── Status → badge classes ────────────────────────────────────────────────────

const STATUS_BADGE: Record<CoarseStatus, string> = {
  completed: "bg-green-100 text-green-700 border-green-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  scheduled: "bg-sky-100 text-sky-700 border-sky-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABEL: Record<CoarseStatus, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  scheduled: "Scheduled",
  cancelled: "Cancelled",
};

// ── Callbacks ─────────────────────────────────────────────────────────────────

/** Row action callbacks — parent wires these to router navigation / doctorStore modals. */
export interface AppointmentDemoColumnCallbacks {
  onView: (row: TAppointmentResponse) => void;
  onReview: (row: TAppointmentResponse) => void;
  onConsult: (row: TAppointmentResponse) => void;
  onInPersonConsult: (row: TAppointmentResponse) => void;
  onConfirm: (row: TAppointmentResponse) => void;
  onReschedule: (row: TAppointmentResponse) => void;
  onCancel: (row: TAppointmentResponse) => void;
  onClinicalRecords: (row: TAppointmentResponse) => void;
}

interface CreateColumnsOptions {
  callbacks: AppointmentDemoColumnCallbacks;
  /** Patient records keyed by FHIR Patient.id, resolved for the current page only. */
  patients: Record<number, TPatientResponse | null>;
  /**
   * Whether this tab exposes a server-side Status filter. Disabled for tabs
   * whose scope is already status-fixed (Upcoming = active statuses only,
   * Cancelled = cancelled only) so the filter can't contradict the tab.
   */
  enableStatusFilter: boolean;
  /**
   * Whether this tab exposes a server-side date-range filter. Disabled on
   * "Today", which is inherently scoped to a single day already.
   */
  enableDateFilter: boolean;
}

// ── Row primary action ────────────────────────────────────────────────────────

function RowPrimaryAction({
  appointment,
  status,
  telemedicine,
  callbacks,
}: {
  appointment: TAppointmentResponse;
  status: CoarseStatus;
  telemedicine: boolean;
  callbacks: AppointmentDemoColumnCallbacks;
}) {
  if (status === "completed") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs"
        onClick={() => callbacks.onReview(appointment)}
      >
        View Note
      </Button>
    );
  }
  if (status === "in-progress") {
    return (
      <Button
        size="sm"
        className="h-7 px-2.5 text-xs"
        onClick={() =>
          telemedicine
            ? callbacks.onConsult(appointment)
            : callbacks.onInPersonConsult(appointment)
        }
      >
        {telemedicine ? "Join Visit" : "Continue Visit"}
      </Button>
    );
  }
  if (status === "scheduled" && telemedicine) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs"
        onClick={() => callbacks.onConsult(appointment)}
      >
        Start Visit
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 px-2.5 text-xs"
      onClick={() => callbacks.onView(appointment)}
    >
      View Details
    </Button>
  );
}

// ── Column factory ────────────────────────────────────────────────────────────

/**
 * Builds the ColumnDef array for one appointment-demo tab's table.
 *
 * @param options - Row-action callbacks, the resolved patient map for the
 * current page, and which filters this tab exposes.
 */
export function createAppointmentDemoColumns({
  callbacks,
  patients,
  enableStatusFilter,
  enableDateFilter,
}: CreateColumnsOptions): ColumnDef<TAppointmentResponse>[] {
  return [
    // ── Patient ──────────────────────────────────────────────────────────────
    {
      id: "patient",
      accessorFn: (row) => row.subject_display ?? "—",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Patient" />
      ),
      cell: ({ row }) => {
        const appointment = row.original;
        const patient =
          appointment.subject_id != null ? patients[appointment.subject_id] : null;
        const age = patientAge(patient);
        const gender = patientGenderLabel(patient);
        return (
          <div className="flex items-center gap-2.5">
            <Avatar>
              <AvatarFallback
                className="font-semibold text-foreground/80"
                style={{ backgroundColor: avatarColorFor(appointment.subject_id) }}
              >
                {initialsFor(appointment.subject_display)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">
                {appointment.subject_display ?? "Unknown patient"}
              </div>
              <div className="text-xs text-muted-foreground">
                {[
                  age != null ? `${age} yrs` : null,
                  gender,
                  appointment.subject_id != null ? `ID ${appointment.subject_id}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          </div>
        );
      },
      // Server-side substring match, forwarded as patient_search — no
      // filterFn needed since the parent runs manualFiltering.
      meta: { label: "Patient", variant: "text", placeholder: "Search patient..." },
    },

    // ── Visit type (display only — no server filter param exists for it) ───
    {
      id: "visitType",
      accessorFn: (row) => (isTelemedicine(row) ? "telemedicine" : "in-person"),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Visit Type" />
      ),
      cell: ({ row }) => {
        const telemedicine = isTelemedicine(row.original);
        return (
          <span className="inline-flex items-center gap-1.5 text-sm">
            {telemedicine ? (
              <Video className="size-3.5 text-emerald-600" />
            ) : (
              <Users className="size-3.5 text-violet-600" />
            )}
            {telemedicine ? "Telemedicine" : "In-Person"}
          </span>
        );
      },
      enableSorting: false,
      meta: { label: "Visit Type" },
    },

    // ── Time ─────────────────────────────────────────────────────────────────
    {
      id: "time",
      accessorFn: (row) => row.start,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Time" />,
      cell: ({ row }) => {
        const { start, end } = row.original;
        return (
          <div>
            <div className="text-sm font-medium tabular-nums">
              {start
                ? new Date(start).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
            {end && (
              <div className="text-xs text-muted-foreground tabular-nums">
                –{" "}
                {new Date(end).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        );
      },
      // dateRange renders a calendar-range popover in the toolbar; the parent
      // reads [from, to] out of this column's filter value and forwards it
      // as start_from/start_to. Only enabled on tabs not already date-scoped.
      meta: enableDateFilter ? { label: "Time", variant: "dateRange" } : { label: "Time" },
    },

    // ── Reason / Notes (display only) ───────────────────────────────────────
    {
      id: "reason",
      accessorFn: (row) => reasonLine(row),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Reason / Notes" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium">{reasonLine(row.original)}</div>
          <div className="text-xs text-muted-foreground">{noteLine(row.original)}</div>
        </div>
      ),
      enableSorting: false,
      meta: { label: "Reason / Notes" },
    },

    // ── Status ───────────────────────────────────────────────────────────────
    {
      id: "status",
      accessorFn: (row) => row.status ?? "",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
      cell: ({ row }) => {
        const coarse = toCoarseStatus(row.original.status);
        return (
          <Badge variant="outline" className={STATUS_BADGE[coarse]}>
            {STATUS_LABEL[coarse]}
          </Badge>
        );
      },
      enableSorting: false,
      meta: enableStatusFilter
        ? { label: "Status", variant: "multiSelect", options: APPOINTMENT_STATUS_OPTIONS }
        : { label: "Status" },
      // Server owns filtering (manualFiltering) — this only satisfies
      // column.getCanFilter() so the toolbar renders the control.
      filterFn: (row, _columnId, filterValue: string[]) =>
        !filterValue?.length || filterValue.includes(row.original.status ?? ""),
    },

    // ── Actions ──────────────────────────────────────────────────────────────
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const appointment = row.original;
        const status = toCoarseStatus(appointment.status);
        const telemedicine = isTelemedicine(appointment);
        const canConfirm = appointment.status === "pending";
        const canCancel =
          appointment.status === "booked" || appointment.status === "pending";
        const canReschedule =
          (appointment.status === "pending" || appointment.status === "booked") &&
          !!appointment.slot?.length;
        const canOpenClinicalRecords = appointment.subject_id != null;

        const actions: RowAction<TAppointmentResponse>[] = [
          ...(canConfirm
            ? [{ label: "Confirm", onClick: () => callbacks.onConfirm(appointment) }]
            : []),
          ...(canReschedule
            ? [{ label: "Reschedule", onClick: () => callbacks.onReschedule(appointment) }]
            : []),
          ...(canCancel
            ? [{ label: "Cancel", onClick: () => callbacks.onCancel(appointment) }]
            : []),
          ...(canOpenClinicalRecords
            ? [
                {
                  label: "View Patient Chart",
                  onClick: () => callbacks.onClinicalRecords(appointment),
                },
              ]
            : []),
        ];

        return (
          <div className="flex items-center justify-end gap-1">
            <RowPrimaryAction
              appointment={appointment}
              status={status}
              telemedicine={telemedicine}
              callbacks={callbacks}
            />
            {actions.length > 0 && (
              <DataTableRowActions row={row} actions={actions} />
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      meta: { exportable: false },
    },
  ];
}
