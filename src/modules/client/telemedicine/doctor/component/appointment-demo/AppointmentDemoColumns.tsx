/**
 * @file AppointmentDemoColumns.tsx
 * @description Column definitions for the doctor appointments page's per-tab
 * TanStack Table instances — mirrors DoctorAppointmentColumns.tsx's factory
 * pattern (callbacks injected, columns stay pure), reuses its exact
 * AppointmentStatusBadge/STATUS_LABEL for the status column, with this
 * page's own cell styling otherwise (avatar + patient info, visit-type icon,
 * reason/note two-liner).
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { formatDisplayDayMonth, formatDisplayTime } from "@/modules/shared/helper";
import {
  DataTableColumnHeader,
  DataTableExpandButton,
  DataTableRowActions,
  type RowAction,
} from "@/modules/client/shared/components/tables";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  Stethoscope,
  User,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import {
  APPOINTMENT_STATUS_OPTIONS,
  AppointmentStatusBadge,
} from "@/modules/client/telemedicine/doctor/component/appointments/list/DoctorAppointmentColumns";
import {
  isTelemedicine,
  noteLine,
  patientAge,
  patientGenderLabel,
  reasonLine,
  toCoarseStatus,
  type CoarseStatus,
} from "./appointmentDisplay";

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
//
// Status-specific highlight button, shown *in addition to* the always-present
// View/Join Meeting/In-Person buttons below (never a replacement for them —
// see the actions cell). Only "completed" and "in-progress" (checked-in/
// arrived) get one: a "scheduled" (incl. booked) appointment is already fully
// covered by View plus the Join Meeting/In-Person pair when booked, and
// "cancelled" has nothing further to do.

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
        className="h-7 px-2.5 text-xs gap-1"
        onClick={() => callbacks.onReview(appointment)}
      >
        <ClipboardList className="size-3" />
        View Note
      </Button>
    );
  }
  if (status === "in-progress") {
    return (
      <Button
        size="sm"
        className="h-7 px-2.5 text-xs gap-1"
        onClick={() =>
          telemedicine
            ? callbacks.onConsult(appointment)
            : callbacks.onInPersonConsult(appointment)
        }
      >
        {telemedicine ? (
          <Video className="size-3" />
        ) : (
          <Stethoscope className="size-3" />
        )}
        {telemedicine ? "Join Visit" : "Continue Visit"}
      </Button>
    );
  }
  return null;
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
    // ── Expand ───────────────────────────────────────────────────────────────
    // Leads the row, same as DoctorAppointmentColumns — drives the
    // AppointmentDetailPanel row-detail wired in AppointmentDemoTabPanel.
    {
      id: "expand",
      header: () => null,
      cell: ({ row }) => <DataTableExpandButton row={row} />,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 40,
      meta: { exportable: false },
    },

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
            {/* One consistent icon for every row rather than per-patient
                initials/color — no profile photo is wired up here, and a
                plain, uniform mark reads cleaner than a fake-personalized
                fallback. Matches the real appointments page's own patient
                icon (DoctorAppointmentColumns). */}
            <Avatar>
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">
                {appointment.subject_display ?? "Unknown patient"}
              </div>
              <div className="text-xs text-muted-foreground">
                {/* ID moved to the expandable row's Participants section —
                    see AppointmentDetailPanel — so it's available without
                    cluttering this always-visible line. */}
                {[age != null ? `${age} yrs` : null, gender]
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

    // ── Date ─────────────────────────────────────────────────────────────────
    // Split from Time — matches DoctorAppointmentColumns, which keeps these
    // as two independently sortable columns off the same `start` timestamp.
    {
      id: "date",
      accessorFn: (row) => row.start,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Date" multiSort />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          {row.original.start ? formatDisplayDayMonth(row.original.start) : "—"}
        </span>
      ),
      // dateRange renders a calendar-range popover in the toolbar; the parent
      // reads [from, to] out of this column's filter value and forwards it
      // as start_from/start_to. Only enabled on tabs not already date-scoped.
      meta: enableDateFilter ? { label: "Date", variant: "dateRange" } : { label: "Date" },
    },

    // ── Time ─────────────────────────────────────────────────────────────────
    {
      id: "time",
      accessorFn: (row) => row.start,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Time" multiSort />
      ),
      cell: ({ row }) => {
        const { start, end } = row.original;
        return (
          <div>
            <div className="text-sm font-medium tabular-nums">
              {start ? formatDisplayTime(start) : "—"}
            </div>
            {end && (
              <div className="text-xs text-muted-foreground tabular-nums">
                – {formatDisplayTime(end)}
              </div>
            )}
          </div>
        );
      },
      meta: { label: "Time" },
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
      cell: ({ row }) => <AppointmentStatusBadge status={row.original.status} />,
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
        // Matches DoctorAppointmentColumns exactly: both the virtual-room and
        // in-person buttons show for *any* booked appointment, regardless of
        // its own declared modality — the doctor picks the mode, not the
        // record. Deliberately the literal "booked" status, not the coarser
        // bucket above (which also covers proposed/pending/waitlist, none of
        // which have a confirmed slot to join yet).
        const isBooked = appointment.status === "booked";
        const canConfirm = appointment.status === "pending";
        const canCancel =
          appointment.status === "booked" || appointment.status === "pending";
        const canReschedule =
          (appointment.status === "pending" || appointment.status === "booked") &&
          !!appointment.slot?.length;
        const canOpenClinicalRecords = appointment.subject_id != null;

        const actions: RowAction<TAppointmentResponse>[] = [
          // Omitted when "completed" — the primary button already covers the
          // exact same action (onReview) far more prominently there.
          ...(status !== "completed"
            ? [
                {
                  label: "Review",
                  icon: ClipboardList,
                  onClick: () => callbacks.onReview(appointment),
                },
              ]
            : []),
          ...(canOpenClinicalRecords
            ? [
                {
                  label: "View Patient Chart",
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
            ? [
                {
                  label: "Cancel",
                  icon: XCircle,
                  onClick: () => callbacks.onCancel(appointment),
                },
              ]
            : []),
        ];

        return (
          <div className="flex items-center justify-end gap-1">
            {/* Always present, independent of status — same as the real
                appointments page's inline View button. */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => callbacks.onView(appointment)}
            >
              <Eye className="size-3" />
              View
            </Button>
            <RowPrimaryAction
              appointment={appointment}
              status={status}
              telemedicine={telemedicine}
              callbacks={callbacks}
            />
            {isBooked && (
              <>
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => callbacks.onConsult(appointment)}
                >
                  <Video className="size-3" />
                  Join Meeting
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => callbacks.onInPersonConsult(appointment)}
                >
                  <Stethoscope className="size-3" />
                  In-Person
                </Button>
              </>
            )}
            <DataTableRowActions row={row} actions={actions} />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      meta: { exportable: false },
    },
  ];
}
