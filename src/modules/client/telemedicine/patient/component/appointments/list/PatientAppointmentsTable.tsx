/**
 * PatientAppointmentsTable — client-side appointments list for the patient portal.
 *
 * Layer: client / telemedicine / patient / appointments / list
 *
 * Renders the patient's own appointment history and upcoming appointments using
 * the shared TanStack Table v8 system. Server-side pagination with client-side
 * status/doctor filters.
 *
 * Mutation flow:
 *  - Cancel / Delete: row action callbacks open the matching modal via the
 *    patient Zustand store. The modals (CancelAppointmentModal,
 *    DeleteAppointmentModal) handle the server action and cache invalidation.
 *
 * Pattern source: OrganizationsTable.tsx (useServerDataTable + useQuery + two-state seeding).
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { endOfDay } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableToolbar,
  useServerDataTable,
  useDebouncedValue,
} from "@/modules/client/shared/components/tables";
import {
  type TAppointmentResponse,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import {
  DEFAULT_APPOINTMENT_SORT,
  patientAppointmentKeys,
  fetchMyAppointments,
} from "./appointmentQueries";
import { createPatientAppointmentColumns } from "./PatientAppointmentColumns";
import { patientStore } from "@/modules/client/telemedicine/patient/stores/patient.store";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size for the patient appointment list. */
const INITIAL_PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Props accepted by PatientAppointmentsTable. */
interface PatientAppointmentsTableProps {
  /**
   * SSR-fetched first page — seeds the table immediately to avoid a
   * loading flash on navigation. Subsequent pages are fetched client-side.
   */
  initialData: TPaginatedAppointmentResponse;
  /** Localised href for the manual booking wizard (e.g. /en/…/appointments/book). */
  bookHref: string;
  /** Localised href for the intake chooser (e.g. /en/…/intake). */
  intakeHref: string;
  /** Localised base href for appointment detail pages (e.g. /en/…/appointments). */
  viewHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client-side patient appointments table.
 *
 * Accepts an SSR-seeded initial page and re-fetches on pagination changes.
 * Row actions (View, Cancel, Delete) delegate to router.push or the patient
 * Zustand store — no local dialog state or mutation logic lives here.
 *
 * @param initialData - First-page data fetched on the server.
 * @param bookHref - Localised href for the "Book Appointment" modal trigger.
 * @param intakeHref - Localised href for the AI intake flow.
 * @param viewHref - Base href for the appointment detail page.
 */
export function PatientAppointmentsTable({
  initialData,
  bookHref,
  intakeHref,
  viewHref,
}: PatientAppointmentsTableProps) {
  const router = useRouter();

  // ── Row + page count state (seeded from SSR, synced from client query) ──────
  // Ordering is now server-side (sort, applied by fetchMyAppointments and
  // page.tsx's SSR fetch) — no client re-sort here.
  const [rows, setRows] = useState<TAppointmentResponse[]>(initialData.data ?? []);
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  // ── Column definitions (memo-stable) ────────────────────────────────────────
  const columns = useMemo(
    () =>
      createPatientAppointmentColumns({
        onView: (row) => router.push(`${viewHref}/${row.id}`),
        onCancel: (row) =>
          patientStore.getState().onOpen({
            type: "cancelAppointment",
            data: { appointment: row },
          }),
        onReschedule: (row) =>
          patientStore.getState().onOpen({
            type: "rescheduleAppointment",
            data: { appointment: row },
          }),
        // Navigates to the virtual consultation room for this appointment.
        // The page reads ?appointmentId to fetch the LiveKit room_id.
        onConsult: (row) =>
          router.push(`${viewHref}/online-consultation?appointmentId=${row.id}`),
      }),
    [router, viewHref],
  );

  // ── TanStack Table ───────────────────────────────────────────────────────────
  const { table, state, resetPage } = useServerDataTable({
    columns,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    // Default sort: newest day first, chronological within each day.
    // Matches DEFAULT_APPOINTMENT_SORT so the SSR-seeded page and the first
    // client render agree on ordering. Seeding both entries (rather than
    // just "date") also makes both headers show their sorted-direction
    // chevron on load — clicking either one afterwards still replaces the
    // whole sort with just that column, same single-sort behavior as any
    // other column here.
    initialSorting: [
      { id: "date", desc: true },
      { id: "time", desc: false },
    ],
    // Type and Duration are secondary detail — hidden by default to keep the
    // table compact; still available via the toolbar's column-visibility toggle.
    initialColumnVisibility: { appointment_type: false, duration: false },
  });

  // Extract server-side filter params from the column filter state.
  // multiSelect returns string[] — join every selected status into one
  // comma-separated string; the backend ORs them together. undefined means
  // "no filter" (all statuses).
  const statusFilter = state.columnFilters.find((f) => f.id === "status")
    ?.value as string[] | undefined;
  const activeStatus =
    statusFilter && statusFilter.length > 0 ? statusFilter.join(",") : undefined;

  // Doctor name search — debounced so typing doesn't fire a request per
  // keystroke. The input itself (rendered by DataTableToolbar from the
  // column's meta.variant: "text") updates columnFilters immediately for a
  // responsive box; this is a delayed echo used only for the actual fetch.
  const doctorFilterRaw = state.columnFilters.find((f) => f.id === "doctor")
    ?.value as string | undefined;
  const practitionerSearch = useDebouncedValue(doctorFilterRaw, 400);

  // Date range — the "date" column's dateRange filter (same shared toolbar
  // system as doctor/status) stores a [fromMs, toMs] timestamp pair. "to" is
  // bumped to end-of-day so the picked day is inclusive.
  const dateFilterRaw = state.columnFilters.find((f) => f.id === "date")
    ?.value as [number | undefined, number | undefined] | undefined;
  const startFrom = dateFilterRaw?.[0]
    ? new Date(dateFilterRaw[0]).toISOString()
    : undefined;
  const startTo = dateFilterRaw?.[1]
    ? endOfDay(new Date(dateFilterRaw[1])).toISOString()
    : undefined;

  // Reset to page 0 whenever a filter changes so stale page indices don't
  // produce empty results.
  useEffect(() => {
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, practitionerSearch, startFrom, startTo]);

  // Maps a TanStack column id to the fhir-server `_sort` field it
  // corresponds to. "date" and "time" both derive from the same underlying
  // `start` timestamp, but the backend splits it into independent `day` /
  // `time-of-day` sort expressions — so each header can carry its own
  // direction (e.g. date desc + time asc simultaneously) rather than both
  // collapsing onto the one full-timestamp `date` token. "doctor" has no
  // dedicated backend sort field (practitioner name lives on the
  // participant row, not a denormalised column on Appointment) — left
  // unmapped, so sorting by it falls back to the default.
  const SORT_FIELD_MAP: Record<string, string> = useMemo(
    () => ({
      date: "day",
      time: "time-of-day",
      status: "status",
      appointment_type: "type",
      duration: "duration",
    }),
    [],
  );

  // Builds a FHIR `_sort`-style string from the table's column-header sort
  // state. Falls back to DEFAULT_APPOINTMENT_SORT when nothing is explicitly
  // sorted (or every sorted column id is unmapped).
  const sort = useMemo(() => {
    if (state.sorting.length === 0) return DEFAULT_APPOINTMENT_SORT;
    const tokens = state.sorting
      .map((s) => {
        const field = SORT_FIELD_MAP[s.id];
        return field ? (s.desc ? `-${field}` : field) : null;
      })
      .filter((t): t is string => t !== null);
    return tokens.length > 0 ? tokens.join(",") : DEFAULT_APPOINTMENT_SORT;
  }, [state.sorting, SORT_FIELD_MAP]);

  // ── Server query ─────────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: patientAppointmentKeys.list({
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      status: activeStatus,
      practitionerSearch,
      startFrom,
      startTo,
      sort,
    }),
    queryFn: () =>
      fetchMyAppointments({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
        status: activeStatus,
        practitionerSearch,
        startFrom,
        startTo,
        sort,
      }),
    // Only seed the SSR data for the exact query page.tsx pre-fetched: no
    // filter, default sort, page 0. Any other key (filtered, re-sorted,
    // paginated) must always fetch — if we pass initialData for every key,
    // TanStack marks it "fresh" with the wrong data and skips the fetch
    // entirely for staleTime duration.
    initialData:
      !activeStatus &&
      !practitionerSearch &&
      !startFrom &&
      !startTo &&
      sort === DEFAULT_APPOINTMENT_SORT &&
      state.pagination.pageIndex === 0
        ? initialData
        : undefined,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // Sync table rows whenever a new page or filter result arrives
  useEffect(() => {
    if (data) {
      setRows(data.data ?? []);
      setPageCount(
        Math.ceil((data.total ?? 0) / state.pagination.pageSize),
      );
    }
  }, [data, state.pagination.pageSize]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DataTable table={table} loading={isFetching}>
      <DataTableToolbar table={table}>
        {/* Opens the booking method chooser dialog via the patient store */}
        <Button
          size="sm"
          className="ml-auto"
          onClick={() =>
            patientStore.getState().onOpen({
              type: "bookAppointment",
              data: { bookHref, intakeHref },
            })
          }
        >
          <CalendarPlus className="size-4 mr-1.5" />
          Book Appointment
        </Button>
      </DataTableToolbar>
    </DataTable>
  );
}
