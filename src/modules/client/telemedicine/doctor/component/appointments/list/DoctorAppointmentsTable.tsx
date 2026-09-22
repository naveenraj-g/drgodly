/**
 * DoctorAppointmentsTable — client-side appointments list for the doctor portal.
 *
 * Layer: client / telemedicine / doctor / appointments / list
 *
 * Renders the org-scoped appointment list for a practitioner using the shared
 * TanStack Table v8 system. Server-side pagination, client-side status/patient
 * filters.
 *
 * Mutation flow:
 *  - Confirm / Cancel / Delete: row action callbacks open the matching modal
 *    via the doctor Zustand store. The modals (ConfirmAppointmentModal,
 *    CancelAppointmentModal, DeleteAppointmentModal) handle the server action
 *    and cache invalidation.
 *
 * Pattern source: OrganizationsTable.tsx (useServerDataTable + useQuery + two-state seeding).
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { startOfDayIST, endOfDayIST } from "@/modules/shared/helper";
import {
  DataTableWithViews,
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
  doctorAppointmentKeys,
  fetchDoctorAppointments,
} from "./appointmentQueries";
import {
  createDoctorAppointmentColumns,
  type DoctorAppointmentColumnCallbacks,
} from "./DoctorAppointmentColumns";
import { DoctorAppointmentCard } from "./DoctorAppointmentCard";
import { AppointmentDetailPanel } from "@/modules/client/telemedicine/shared/components/appointment/AppointmentDetailPanel";
import { doctorStore } from "@/modules/client/telemedicine/doctor/stores/doctor.store";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size for the doctor appointment list. */
const INITIAL_PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Props accepted by DoctorAppointmentsTable. */
interface DoctorAppointmentsTableProps {
  /**
   * SSR-fetched first page — seeds the table immediately to avoid a
   * loading flash on navigation. Subsequent pages are fetched client-side.
   */
  initialData: TPaginatedAppointmentResponse;
  /** Active organisation ID from the server session, used to scope the list query. */
  orgId: string | null;
  /**
   * FHIR Practitioner.id (integer) of the logged-in doctor.
   * When present, the list is scoped to only appointments where this
   * practitioner is a participant. Null falls back to org-wide listing.
   */
  practitionerId: number | null;
  /** Localised base href for appointment detail pages (e.g. /en/…/appointments). */
  viewHref: string;
  /** Localised base href for Clinical Records (e.g. /en/…/doctor/clinical-records). */
  clinicalRecordsHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client-side doctor appointments table.
 *
 * Accepts an SSR-seeded initial page and re-fetches on pagination changes.
 * Row actions (View, Confirm, Cancel, Delete) delegate to router.push or the
 * doctor Zustand store — no local dialog state or mutation logic lives here.
 *
 * @param initialData - First-page data fetched on the server.
 * @param orgId - Active organisation ID for scoping the list query.
 * @param practitionerId - FHIR Practitioner.id to scope appointments to this doctor.
 * @param viewHref - Base href for the appointment detail page.
 * @param clinicalRecordsHref - Base href for Clinical Records.
 */
export function DoctorAppointmentsTable({
  initialData,
  orgId,
  practitionerId,
  viewHref,
  clinicalRecordsHref,
}: DoctorAppointmentsTableProps) {
  const router = useRouter();

  // ── Row + page count state (seeded from SSR, synced from client query) ──────
  // Ordering is now server-side (sort=status-priority,-date, applied by
  // fetchDoctorAppointments and page.tsx's SSR fetch) — no client re-sort here.
  const [rows, setRows] = useState<TAppointmentResponse[]>(initialData.data ?? []);
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  // ── Row action callbacks (memo-stable, shared by table cells and grid cards) ──
  const callbacks: DoctorAppointmentColumnCallbacks = useMemo(
    () => ({
      onView: (row) => router.push(`${viewHref}/${row.id}`),
      onConfirm: (row) =>
        doctorStore.getState().onOpen({
          type: "confirmAppointment",
          data: { appointment: row },
        }),
      onCancel: (row) =>
        doctorStore.getState().onOpen({
          type: "cancelAppointment",
          data: { appointment: row },
        }),
      onReschedule: (row) =>
        doctorStore.getState().onOpen({
          type: "rescheduleAppointment",
          data: { appointment: row },
        }),
      // Navigates to the virtual consultation room for this appointment.
      // The page reads ?appointmentId to fetch the LiveKit room_id.
      onConsult: (row) =>
        router.push(`${viewHref}/online-consultation?appointmentId=${row.id}`),
      // Navigates to the in-person diarization recording screen for this appointment.
      onInPersonConsult: (row) =>
        router.push(`${viewHref}/inperson-consultation?appointmentId=${row.id}`),
      // Navigates to the post-consultation review page for this appointment.
      onReview: (row) => router.push(`${viewHref}/${row.id}/review`),
      // Navigates to Clinical Records for this appointment's patient — same
      // deep-link shape as the Dashboard's own "Clinical Records" button.
      onClinicalRecords: (row) =>
        router.push(`${clinicalRecordsHref}/${row.subject_id}/${row.id}`),
    }),
    [router, viewHref, clinicalRecordsHref],
  );

  // ── Column definitions (memo-stable) ────────────────────────────────────────
  const columns = useMemo(
    () => createDoctorAppointmentColumns(callbacks),
    [callbacks],
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
    // Every appointment carries detail worth expanding into, so no row is
    // excluded — the panel hides its own empty sections.
    getRowCanExpand: () => true,
  });

  // Extract server-side filter params from the column filter state.
  // multiSelect returns string[] — join every selected status into one
  // comma-separated string; the backend ORs them together (status.in_(...)
  // when there's more than one, a plain equality check for a single value).
  // undefined means "no filter" (all statuses).
  const statusFilter = state.columnFilters.find((f) => f.id === "status")
    ?.value as string[] | undefined;
  const activeStatus =
    statusFilter && statusFilter.length > 0 ? statusFilter.join(",") : undefined;

  // Patient name search — debounced so typing doesn't fire a request per
  // keystroke. The input itself (rendered by DataTableToolbar from the
  // column's meta.variant: "text") updates columnFilters immediately for a
  // responsive box; this is a delayed echo used only for the actual fetch.
  const patientFilterRaw = state.columnFilters.find((f) => f.id === "patient")
    ?.value as string | undefined;
  const patientSearch = useDebouncedValue(patientFilterRaw, 400);

  // Date range — the "date" column's dateRange filter (same shared toolbar
  // system as patient/status) stores a [fromMs, toMs] timestamp pair.
  // "to" is bumped to end-of-day so the picked day is inclusive — a bare
  // midnight timestamp would otherwise exclude every appointment later that
  // same day, same correction DoctorDashboard's own range fetch applies.
  const dateFilterRaw = state.columnFilters.find((f) => f.id === "date")
    ?.value as [number | undefined, number | undefined] | undefined;
  const startFrom = dateFilterRaw?.[0]
    ? startOfDayIST(dateFilterRaw[0]).toISOString()
    : undefined;
  const startTo = dateFilterRaw?.[1]
    ? endOfDayIST(dateFilterRaw[1]).toISOString()
    : undefined;

  // Reset to page 0 whenever a filter changes so stale page indices don't
  // produce empty results.
  useEffect(() => {
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, patientSearch, startFrom, startTo]);

  // Maps a TanStack column id to the fhir-server `_sort` field it
  // corresponds to. "date" and "time" both derive from the same underlying
  // `start` timestamp, but the backend splits it into independent `day` /
  // `time-of-day` sort expressions — so each header can carry its own
  // direction (e.g. date desc + time asc simultaneously) rather than both
  // collapsing onto the one full-timestamp `date` token.
  const SORT_FIELD_MAP: Record<string, string> = useMemo(
    () => ({
      date: "day",
      time: "time-of-day",
      patient: "patient",
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
    queryKey: doctorAppointmentKeys.list({
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      orgId,
      practitionerId,
      status: activeStatus,
      patientSearch,
      startFrom,
      startTo,
      sort,
    }),
    queryFn: () =>
      fetchDoctorAppointments({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
        orgId,
        practitionerId,
        status: activeStatus,
        patientSearch,
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
      !patientSearch &&
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
    <DataTableWithViews
      table={table}
      loading={isFetching}
      toolbar={<DataTableToolbar table={table} />}
      renderSubComponent={(row) => (
        <AppointmentDetailPanel row={row} perspective="doctor" />
      )}
      renderCard={(row) => <DoctorAppointmentCard row={row} callbacks={callbacks} />}
      gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    />
  );
}
