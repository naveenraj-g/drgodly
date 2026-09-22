/**
 * Medical Records appointment-picker column definitions.
 *
 * Layer: client / telemedicine / patient / medical-records
 *
 * Produces TanStack Table v8 ColumnDef array for the patient's own list of
 * fulfilled appointments (Step 1 of MedicalRecordsClient). Columns: Doctor,
 * Date, Time, Duration, Type, Status, Actions.
 *
 * Every appointment passed into this table is already fulfilled — the
 * "Status" column is a static badge, not a filter, since filtering by status
 * would have nothing to narrow.
 *
 * Factory function pattern — mirrors PatientAppointmentColumns.tsx exactly so
 * column definitions stay pure and testable independent of the table.
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { formatDisplayDate, formatDisplayTime } from "@/modules/shared/helper";
import {
  DataTableColumnHeader,
  dateFilterFn,
} from "@/modules/client/shared/components/tables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, User } from "lucide-react";
import { type TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO 8601 datetime string as a localised date string.
 * @param isoString - UTC datetime string from the FHIR API, or nullish.
 */
function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return formatDisplayDate(isoString);
}

/**
 * Formats an ISO 8601 datetime string as a localised time string.
 * @param isoString - UTC datetime string from the FHIR API, or nullish.
 */
function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return formatDisplayTime(isoString);
}

/**
 * Derives a human-readable duration string from start/end, falling back to
 * minutes_duration when the end time is absent.
 *
 * @param start - ISO start datetime.
 * @param end - ISO end datetime.
 * @param minutesDuration - Explicit duration in minutes (fallback).
 */
function formatDuration(
  start: string | null | undefined,
  end: string | null | undefined,
  minutesDuration: number | null | undefined,
): string {
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
  if (mins == null || mins <= 0) return "—";

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/**
 * Resolves the treating practitioner's display name from the participant array.
 * @param participants - Appointment participant array, may be null.
 */
export function getDoctorName(
  participants: TAppointmentResponse["participant"],
): string {
  return (
    participants?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? "—"
  );
}

// ── Column factory ────────────────────────────────────────────────────────────

/** Callbacks injected into the actions cell by the parent picker component. */
export interface MedicalRecordsAppointmentColumnCallbacks {
  /** Called when the patient picks an appointment to view its orders/uploads. */
  onSelect: (row: TAppointmentResponse) => void;
}

/**
 * Builds the ColumnDef array for the Medical Records appointment picker.
 *
 * @param callbacks - Parent-provided selection callback for the actions cell.
 * @returns TanStack Table v8 column definitions.
 */
export function createMedicalRecordsAppointmentColumns(
  callbacks: MedicalRecordsAppointmentColumnCallbacks,
): ColumnDef<TAppointmentResponse>[] {
  return [
    // ── Doctor (Practitioner participant) ────────────────────────────────────
    {
      id: "doctor",
      accessorFn: (row) => getDoctorName(row.participant),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Doctor" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <User className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium truncate max-w-40">
            {getDoctorName(row.original.participant)}
          </span>
        </div>
      ),
      filterFn: (row, id, value: string) =>
        String(row.getValue(id))
          .toLowerCase()
          .includes(String(value).toLowerCase()),
      meta: {
        label: "Doctor",
        variant: "text",
        placeholder: "Search doctor...",
      },
    },

    // ── Date ─────────────────────────────────────────────────────────────────
    {
      id: "date",
      accessorFn: (row) => row.start,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Date" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {formatDate(row.original.start)}
        </span>
      ),
      filterFn: (row, id, value: number | undefined) =>
        dateFilterFn(row.getValue(id), value),
      meta: { label: "Date", variant: "date" },
    },

    // ── Time ─────────────────────────────────────────────────────────────────
    {
      id: "time",
      accessorFn: (row) => row.start,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Time" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {formatTime(row.original.start)}
        </span>
      ),
      meta: { label: "Time" },
    },

    // ── Duration ─────────────────────────────────────────────────────────────
    {
      id: "duration",
      accessorFn: (row) =>
        formatDuration(row.start, row.end, row.minutes_duration),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Duration" />
      ),
      cell: ({ getValue }) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {getValue() as string}
        </span>
      ),
      meta: { label: "Duration" },
    },

    // ── Appointment type ─────────────────────────────────────────────────────
    {
      id: "appointment_type",
      accessorFn: (row) =>
        row.appointment_type_display ?? row.appointment_type_text ?? "—",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Type" />
      ),
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {getValue() as string}
        </span>
      ),
      meta: { label: "Type" },
    },

    // ── Status (static — every row here is already fulfilled) ──────────────
    {
      id: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: () => (
        <Badge variant="secondary" className="text-xs font-normal">
          Completed
        </Badge>
      ),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: "Status", exportable: false },
    },

    // ── Actions ──────────────────────────────────────────────────────────────
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => callbacks.onSelect(row.original)}
        >
          View Orders
          <ChevronRight className="size-3 ml-1" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 130,
      meta: { exportable: false },
    },
  ];
}
