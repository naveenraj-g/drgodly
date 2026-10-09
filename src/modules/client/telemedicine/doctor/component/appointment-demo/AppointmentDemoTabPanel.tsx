/**
 * @file AppointmentDemoTabPanel.tsx
 * @description One tab's fully server-driven appointments table for the
 * doctor's "My Appointments" page — owns its own useServerDataTable instance
 * and useQuery fetch: server-side pagination (10 rows initially), sorting,
 * and every filter (patient search, status, date range) forwarded to
 * listAppointmentsAction. No client-side filtering/sorting/pagination.
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { startOfDayIST, endOfDayIST } from "@/modules/shared/helper";
import {
  DataTableWithViews,
  DataTableToolbar,
  useServerDataTable,
  useDebouncedValue,
} from "@/modules/client/shared/components/tables";
import { AppointmentDetailPanel } from "@/modules/client/telemedicine/shared/components/appointment/AppointmentDetailPanel";
import { DoctorAppointmentCard } from "@/modules/client/telemedicine/doctor/component/appointments/list/DoctorAppointmentCard";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import {
  createAppointmentDemoColumns,
  type AppointmentDemoColumnCallbacks,
} from "./AppointmentDemoColumns";
import {
  appointmentDemoKeys,
  fetchDemoTabPage,
  type DemoTab,
  type DemoTabPageResult,
} from "./demoQueries";

/** Rows per page on first load. */
const INITIAL_PAGE_SIZE = 10;

/** Default `_sort` token per tab — ascending for the forward-looking tabs, descending (most recent first) for the backward-looking ones. */
const DEFAULT_SORT: Record<DemoTab, string> = {
  today: "date",
  upcoming: "date",
  past: "-date",
  cancelled: "-date",
};

interface AppointmentDemoTabPanelProps {
  tab: DemoTab;
  practitionerId: number;
  orgId: string | null;
  callbacks: AppointmentDemoColumnCallbacks;
  emptyMessage: string;
  /** SSR-seeded first page — only supplied for the initially-active tab. */
  initialData?: DemoTabPageResult;
  enableStatusFilter: boolean;
  enableDateFilter: boolean;
  /**
   * The right-rail mini calendar's picked range — two-way synced with this
   * tab's own "Time" column filter (see the sync effects below). Only
   * meaningful when enableDateFilter is true; inert on "Today", which is
   * fixed to today by definition.
   */
  calendarRange?: DateRange | null;
  /** Reports this tab's own column-filter changes back up to the calendar. */
  onCalendarRangeChange?: (range: DateRange | null) => void;
}

/**
 * Renders one tab's appointments table, fully wired to the server for
 * pagination, sorting, and filtering.
 */
export function AppointmentDemoTabPanel({
  tab,
  practitionerId,
  orgId,
  callbacks,
  emptyMessage,
  initialData,
  enableStatusFilter,
  enableDateFilter,
  calendarRange = null,
  onCalendarRangeChange,
}: AppointmentDemoTabPanelProps) {
  // Columns don't need row data to be built (patients are injected via the
  // `patients` option, not read from a closure), so a stable empty array
  // upfront and the resolved patients map are enough here.
  const [rows, setRows] = useState<TAppointmentResponse[]>(
    initialData?.appointments ?? [],
  );
  const [patients, setPatients] = useState(initialData?.patients ?? {});
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData?.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  const columns = useMemo(
    () =>
      createAppointmentDemoColumns({
        callbacks,
        patients,
        enableStatusFilter,
        enableDateFilter,
      }),
    [callbacks, patients, enableStatusFilter, enableDateFilter],
  );

  const { table, state, resetPage } = useServerDataTable({
    columns,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    // Seeds both headers' chevrons on load, same as DoctorAppointmentsTable:
    // Date keeps this tab's own natural direction (soonest-first for Today/
    // Upcoming, most-recent-first for Past/Cancelled), Time always ascending
    // (chronological within a day) regardless of tab.
    initialSorting: [
      { id: "date", desc: DEFAULT_SORT[tab].startsWith("-") },
      { id: "time", desc: false },
    ],
    // Reason/Notes is secondary detail — hidden by default to keep the table
    // compact, same treatment DoctorAppointmentsTable gives Type/Duration;
    // still available via the toolbar's column-visibility toggle.
    initialColumnVisibility: { reason: false },
    // Every appointment carries detail worth expanding into (cancellation
    // reason, notes, reschedule chain, full participant list) — matches
    // DoctorAppointmentsTable, which excludes no row either.
    getRowCanExpand: () => true,
  });

  // Patient name search — debounced so typing doesn't fire a request per keystroke.
  const patientFilterRaw = state.columnFilters.find((f) => f.id === "patient")
    ?.value as string | undefined;
  const patientSearch = useDebouncedValue(patientFilterRaw, 400);

  const statusFilter = state.columnFilters.find((f) => f.id === "status")
    ?.value as string[] | undefined;
  const status =
    enableStatusFilter && statusFilter && statusFilter.length > 0
      ? statusFilter.join(",")
      : undefined;

  const dateFilterRaw = state.columnFilters.find((f) => f.id === "date")?.value as
    | [number | undefined, number | undefined]
    | undefined;
  const startFrom =
    enableDateFilter && dateFilterRaw?.[0]
      ? startOfDayIST(dateFilterRaw[0]).toISOString()
      : undefined;
  const startTo =
    enableDateFilter && dateFilterRaw?.[1]
      ? endOfDayIST(dateFilterRaw[1]).toISOString()
      : undefined;

  /*
   * Two-way sync with the right-rail mini calendar. The column filter above
   * is this tab's single source of truth; these two effects just mirror it
   * with the calendar's shared range state one level up in AppointmentDemo.
   * A ref tracks the last synced value *by content* (not object identity),
   * so pushing a value down right after it was reported up (or vice versa)
   * sees its own echo and stops instead of ping-ponging forever.
   */
  const lastSyncedRangeKey = useRef("");
  const [dateFrom, dateTo] = dateFilterRaw ?? [];

  // This tab's own filter changed (doctor used the column's date picker, or
  // the effect below just wrote one in) — report it up to the calendar.
  useEffect(() => {
    if (!enableDateFilter) return;
    const key = `${dateFrom ?? ""}-${dateTo ?? ""}`;
    if (key === lastSyncedRangeKey.current) return;
    lastSyncedRangeKey.current = key;
    onCalendarRangeChange?.(
      dateFrom || dateTo
        ? { from: dateFrom ? new Date(dateFrom) : undefined, to: dateTo ? new Date(dateTo) : undefined }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableDateFilter, dateFrom, dateTo]);

  // The calendar's range changed (doctor picked/cleared a date there) —
  // mirror it into this tab's own column filter.
  useEffect(() => {
    if (!enableDateFilter) return;
    const from = calendarRange?.from?.getTime();
    const to = calendarRange?.to?.getTime();
    const key = `${from ?? ""}-${to ?? ""}`;
    if (key === lastSyncedRangeKey.current) return;
    lastSyncedRangeKey.current = key;
    table.getColumn("date")?.setFilterValue(from || to ? [from, to] : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableDateFilter, calendarRange?.from, calendarRange?.to]);

  const sort = useMemo(() => {
    if (state.sorting.length === 0) return DEFAULT_SORT[tab];
    const [{ id, desc }] = state.sorting;
    // Date and Time are separate columns but both derive from the same
    // `start` timestamp, so either one sorts the same underlying field.
    if (id !== "date" && id !== "time") return DEFAULT_SORT[tab];
    return desc ? "-date" : "date";
  }, [state.sorting, tab]);

  // Reset to page 0 whenever a filter changes so stale page indices don't
  // produce empty results.
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientSearch, status, startFrom, startTo]);

  const queryParams = {
    tab,
    practitionerId,
    orgId,
    pageIndex: state.pagination.pageIndex,
    pageSize: state.pagination.pageSize,
    patientSearch,
    status,
    startFrom,
    startTo,
    sort,
  };

  const { data, isFetching } = useQuery({
    queryKey: appointmentDemoKeys.page(queryParams),
    queryFn: () => fetchDemoTabPage(queryParams),
    // Only seed with SSR data for the exact query page.tsx pre-fetched: no
    // filters, default sort, page 0, default page size. Any other key must
    // always fetch — seeding every key would mark stale data "fresh".
    initialData:
      initialData &&
      !patientSearch &&
      !status &&
      !startFrom &&
      !startTo &&
      sort === DEFAULT_SORT[tab] &&
      state.pagination.pageIndex === 0 &&
      state.pagination.pageSize === INITIAL_PAGE_SIZE
        ? initialData
        : undefined,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (data) {
      setRows(data.appointments);
      setPatients(data.patients);
      setPageCount(Math.ceil(data.total / state.pagination.pageSize));
    }
  }, [data, state.pagination.pageSize]);

  return (
    <DataTableWithViews
      table={table}
      loading={isFetching}
      toolbar={<DataTableToolbar table={table} />}
      emptyState={
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      }
      renderSubComponent={(row) => (
        <AppointmentDetailPanel row={row} perspective="doctor" />
      )}
      renderCard={(row) => (
        <DoctorAppointmentCard
          row={row}
          callbacks={callbacks}
          patient={row.original.subject_id != null ? patients[row.original.subject_id] : null}
        />
      )}
      // Pushed up a breakpoint from the usual 1/2/3/4 ladder: this page's
      // right rail (calendar + overview) eats a fixed chunk of width, so a
      // viewport just past the ordinary "4-up" threshold can still render
      // each card cramped on a smaller/lower-res secondary display even
      // though it reads fine on a larger primary one.
      gridClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    />
  );
}
