/**
 * @file AppointmentDemoTabPanel.tsx
 * @description One tab's fully server-driven appointments table for the
 * appointment-demo page — owns its own useServerDataTable instance and
 * useQuery fetch, exactly like DoctorAppointmentsTable does for the real
 * Appointments page: server-side pagination (10 rows initially), sorting,
 * and every filter (patient search, status, date range) forwarded to
 * listAppointmentsAction. No client-side filtering/sorting/pagination.
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfDay } from "date-fns";
import {
  DataTable,
  DataTableToolbar,
  useServerDataTable,
  useDebouncedValue,
} from "@/modules/client/shared/components/tables";
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

/** Rows per page on first load — kept small since this is a redesign prototype. */
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
    initialSorting: [{ id: "time", desc: DEFAULT_SORT[tab].startsWith("-") }],
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

  const dateFilterRaw = state.columnFilters.find((f) => f.id === "time")?.value as
    | [number | undefined, number | undefined]
    | undefined;
  const startFrom =
    enableDateFilter && dateFilterRaw?.[0]
      ? new Date(dateFilterRaw[0]).toISOString()
      : undefined;
  const startTo =
    enableDateFilter && dateFilterRaw?.[1]
      ? endOfDay(new Date(dateFilterRaw[1])).toISOString()
      : undefined;

  const sort = useMemo(() => {
    if (state.sorting.length === 0) return DEFAULT_SORT[tab];
    const [{ id, desc }] = state.sorting;
    if (id !== "time") return DEFAULT_SORT[tab];
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
    <DataTable
      table={table}
      loading={isFetching}
      emptyState={
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      }
    >
      <DataTableToolbar table={table} showViewOptions={false} />
    </DataTable>
  );
}
