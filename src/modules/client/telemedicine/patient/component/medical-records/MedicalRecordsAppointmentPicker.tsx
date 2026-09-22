/**
 * MedicalRecordsAppointmentPicker — Step 1 of the Medical Records page.
 *
 * Layer: client / telemedicine / patient / medical-records
 *
 * Table + card dual view over the patient's fulfilled appointments, using the
 * shared TanStack Table v8 system (DataTableWithViews). Fully client-side —
 * the full appointment list is already SSR-fetched by the parent, so this
 * uses useDataTable (not useServerDataTable) and lets the toolbar's built-in
 * doctor-name text filter and date filter narrow it in memory.
 *
 * Replaces the previous bespoke card-only grid + ad hoc filter row.
 */

"use client";

import { useMemo } from "react";
import { CalendarOff } from "lucide-react";
import {
  DataTableWithViews,
  DataTableToolbar,
  useDataTable,
} from "@/modules/client/shared/components/tables";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import {
  createMedicalRecordsAppointmentColumns,
  type MedicalRecordsAppointmentColumnCallbacks,
} from "./MedicalRecordsAppointmentColumns";
import { MedicalRecordsAppointmentCard } from "./MedicalRecordsAppointmentCard";

/** Default page size — small since this is a per-patient list, not a paged admin table. */
const INITIAL_PAGE_SIZE = 10;

interface MedicalRecordsAppointmentPickerProps {
  /** Pre-fetched fulfilled appointments (SSR) — the full, unfiltered list. */
  appointments: TAppointmentResponse[];
  /** Called when the patient picks an appointment to view its orders/uploads. */
  onSelect: (appt: TAppointmentResponse) => void;
}

/**
 * Table/card picker for the patient's fulfilled appointments.
 *
 * @param appointments - Full SSR-fetched list of fulfilled appointments.
 * @param onSelect - Callback invoked with the chosen appointment.
 */
export function MedicalRecordsAppointmentPicker({
  appointments,
  onSelect,
}: MedicalRecordsAppointmentPickerProps) {
  const callbacks: MedicalRecordsAppointmentColumnCallbacks = useMemo(
    () => ({ onSelect }),
    [onSelect],
  );

  const columns = useMemo(
    () => createMedicalRecordsAppointmentColumns(callbacks),
    [callbacks],
  );

  const { table } = useDataTable({
    columns,
    data: appointments,
    initialPageSize: INITIAL_PAGE_SIZE,
    initialSorting: [{ id: "date", desc: true }],
    // Secondary detail — hidden by default to keep the table compact; still
    // available via the toolbar's column-visibility toggle.
    initialColumnVisibility: { appointment_type: false },
  });

  // Only shown when there are truly no appointments at all — a post-filter
  // "no matches" state is handled by DataTable's own default empty fallback.
  const emptyState =
    appointments.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <CalendarOff className="size-10 opacity-30" />
        <p className="text-sm font-medium text-center">
          No completed appointments yet.
        </p>
        <p className="text-xs text-center max-w-xs opacity-70">
          Completed appointment records will appear here once your doctor has
          finished your consultation.
        </p>
      </div>
    ) : undefined;

  return (
    <DataTableWithViews
      table={table}
      defaultView="grid"
      emptyState={emptyState}
      renderCard={(row) => (
        <MedicalRecordsAppointmentCard row={row} callbacks={callbacks} />
      )}
      gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      toolbar={<DataTableToolbar table={table} />}
    />
  );
}
