/**
 * @file demoQueries.ts
 * @description TanStack Query key factory + fetchers for the appointment-demo
 * page: one paginated/filtered list per tab (Today/Upcoming/Past/Cancelled),
 * a lightweight total-only count per tab (for the tab-strip labels), a
 * same-day summary for Today's stat cards/donut, and the mini calendar's
 * month highlight dates.
 * @layer client/telemedicine/doctor/component/appointment-demo
 *
 * Mirrors appointmentQueries.ts's shape (key factory + a fetcher that calls
 * the same server action page.tsx uses for its SSR seed) so this page follows
 * the same "SSR seeds the default query, useQuery re-fetches on the client,
 * every filter/sort/page is forwarded to the server" pattern as the real
 * DoctorAppointmentsTable — see that file's fetchDoctorAppointments.
 */

import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import type { TConsultationResponse } from "@/modules/entities/schemas/consultation";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { getPatientByIdAction } from "@/modules/server/presentation/actions/patient";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { doctorAppointmentKeys } from "@/modules/client/telemedicine/doctor/component/appointments/list/appointmentQueries";
import { isTelemedicine, toCoarseStatus, type CoarseStatus } from "./appointmentDisplay";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DemoTab = "today" | "upcoming" | "past" | "cancelled";

/** One page of a tab's list, plus the patient records its rows need. */
export interface DemoTabPageResult {
  appointments: TAppointmentResponse[];
  total: number;
  patients: Record<number, TPatientResponse | null>;
}

/** Same-day aggregate for the "Today" tab's stat cards + status donut. */
export interface DemoTodaySummary {
  appointmentsToday: number;
  telemedicine: number;
  inPerson: number;
  pendingNotesCount: number;
  statusBreakdown: Record<CoarseStatus, number>;
}

/** Everything a tab's server query needs — pagination, sort, and whichever
 *  filters that tab exposes (see AppointmentDemoColumns' enableStatusFilter/
 *  enableDateFilter, which decide which of these ever get populated). */
export interface DemoTabQueryParams {
  tab: DemoTab;
  practitionerId: number;
  orgId: string | null;
  pageIndex: number;
  pageSize: number;
  patientSearch?: string;
  /** Comma-joined FHIR status codes — only meaningful on Today/Past. */
  status?: string;
  /** ISO 8601 — only meaningful on Upcoming/Past/Cancelled. */
  startFrom?: string;
  startTo?: string;
  /** FHIR `_sort`-style token, e.g. "date" or "-date". */
  sort?: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const appointmentDemoKeys = {
  /**
   * Shares its root with doctorAppointmentKeys.all rather than using its own
   * — Confirm/Cancel/Reschedule (CancelAppointmentModal etc.) invalidate
   * doctorAppointmentKeys.all, and TanStack's invalidateQueries matches by
   * key *prefix*, so nesting under the same root means those mutations
   * refresh this page's queries too, with no changes to the shared modals.
   */
  all: doctorAppointmentKeys.all,
  lists: () => [...appointmentDemoKeys.all, "appointment-demo-list"] as const,
  page: (params: DemoTabQueryParams) => [...appointmentDemoKeys.lists(), params] as const,
  count: (params: { tab: DemoTab; practitionerId: number; orgId: string | null }) =>
    [...appointmentDemoKeys.all, "appointment-demo-count", params] as const,
  todaySummary: (params: { practitionerId: number; orgId: string | null }) =>
    [...appointmentDemoKeys.all, "appointment-demo-today-summary", params] as const,
  calendar: (params: { practitionerId: number; orgId: string | null }) =>
    [...appointmentDemoKeys.all, "appointment-demo-calendar", params] as const,
};

// ── Patient enrichment ────────────────────────────────────────────────────────

/** Resolves each appointment's Patient record in parallel, deduped by id. */
async function fetchPatientsMap(
  ids: number[],
): Promise<Record<number, TPatientResponse | null>> {
  const uniqueIds = [...new Set(ids)];
  const results = await Promise.all(
    uniqueIds.map((id) => getPatientByIdAction({ payload: { id } })),
  );
  const map: Record<number, TPatientResponse | null> = {};
  uniqueIds.forEach((id, index) => {
    map[id] = (results[index][0] as TPatientResponse | null) ?? null;
  });
  return map;
}

/** Counts fulfilled appointments whose consultation has no published_at yet. */
async function countPendingNotes(fulfilledAppointmentIds: number[]): Promise<number> {
  if (fulfilledAppointmentIds.length === 0) return 0;
  const results = (await Promise.all(
    fulfilledAppointmentIds.map((id) =>
      getConsultationByFhirAppointmentIdAction({ payload: { fhir_appointment_id: id } }),
    ),
  )) as Array<[TConsultationResponse | null, unknown]>;
  return results.filter((result) => !result[0]?.published_at).length;
}

// ── Payload builder ───────────────────────────────────────────────────────────

/**
 * Builds the listAppointmentsAction payload for one tab, combining that
 * tab's fixed baseline scope (date window and/or status set) with whatever
 * filters/pagination/sort the caller supplies. An explicit filter always
 * overrides the tab's own default for that field — the tab only supplies a
 * *default*, never a floor/ceiling the user can't move past — except the two
 * tabs whose status is structurally fixed (Upcoming, Cancelled), which never
 * expose a status filter control in the first place (see
 * AppointmentDemoColumns' enableStatusFilter).
 */
function buildTabPayload(params: DemoTabQueryParams) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const common = {
    practitioner_id: params.practitionerId,
    ...(params.orgId ? { org_id: params.orgId } : {}),
    limit: params.pageSize,
    offset: params.pageIndex * params.pageSize,
    ...(params.patientSearch ? { patient_search: params.patientSearch } : {}),
  };

  if (params.tab === "today") {
    return {
      ...common,
      start_from: todayStart.toISOString(),
      start_to: todayEnd.toISOString(),
      ...(params.status ? { status: params.status } : {}),
      sort: params.sort ?? "date",
    };
  }
  if (params.tab === "upcoming") {
    return {
      ...common,
      start_from: params.startFrom ?? addDays(todayStart, 1).toISOString(),
      ...(params.startTo ? { start_to: params.startTo } : {}),
      status: "proposed,pending,booked,arrived,checked-in,waitlist",
      sort: params.sort ?? "date",
    };
  }
  if (params.tab === "past") {
    return {
      ...common,
      ...(params.startFrom ? { start_from: params.startFrom } : {}),
      start_to: params.startTo ?? todayStart.toISOString(),
      ...(params.status ? { status: params.status } : {}),
      sort: params.sort ?? "-date",
    };
  }
  // cancelled
  return {
    ...common,
    ...(params.startFrom ? { start_from: params.startFrom } : {}),
    ...(params.startTo ? { start_to: params.startTo } : {}),
    status: "cancelled",
    sort: params.sort ?? "-date",
  };
}

// ── Per-tab paginated list ─────────────────────────────────────────────────────

/**
 * Fetches one page of one tab's list, plus the patient records its rows
 * need — used both by page.tsx's SSR fetch (seeding the "today" tab's first
 * page) and by useQuery on the client.
 */
export async function fetchDemoTabPage(
  params: DemoTabQueryParams,
): Promise<DemoTabPageResult> {
  const [page] = await listAppointmentsAction({ payload: buildTabPayload(params) });
  const result = page as TPaginatedAppointmentResponse | null;
  const appointments = result?.data ?? [];
  const total = result?.total ?? 0;

  const patientIds = appointments
    .map((a) => a.subject_id)
    .filter((id): id is number => id != null);
  const patients = await fetchPatientsMap(patientIds);

  return { appointments, total, patients };
}

/** Fetches just the total row count for one tab — used for the tab-strip labels. */
export async function fetchDemoTabCount(params: {
  tab: DemoTab;
  practitionerId: number;
  orgId: string | null;
}): Promise<number> {
  const [page] = await listAppointmentsAction({
    payload: buildTabPayload({ ...params, pageIndex: 0, pageSize: 1 }),
  });
  return (page as TPaginatedAppointmentResponse | null)?.total ?? 0;
}

// ── Today's summary (stat cards + status donut) ──────────────────────────────

/**
 * Fetches every one of today's appointments (independent of the paginated
 * table, which only loads one page at a time) to compute the stat cards and
 * status-breakdown donut, which need the whole day's data, not just the
 * visible page.
 */
export async function fetchDemoTodaySummary(params: {
  practitionerId: number;
  orgId: string | null;
}): Promise<DemoTodaySummary> {
  const [page] = await listAppointmentsAction({
    payload: buildTabPayload({
      tab: "today",
      practitionerId: params.practitionerId,
      orgId: params.orgId,
      pageIndex: 0,
      pageSize: 100,
    }),
  });
  const appointments = (page as TPaginatedAppointmentResponse | null)?.data ?? [];

  const telemedicineCount = appointments.filter(isTelemedicine).length;

  const statusBreakdown: Record<CoarseStatus, number> = {
    completed: 0,
    "in-progress": 0,
    scheduled: 0,
    cancelled: 0,
  };
  appointments.forEach((a) => {
    statusBreakdown[toCoarseStatus(a.status)] += 1;
  });

  const fulfilledIds = appointments.filter((a) => a.status === "fulfilled").map((a) => a.id);
  const pendingNotesCount = await countPendingNotes(fulfilledIds);

  return {
    appointmentsToday: appointments.length,
    telemedicine: telemedicineCount,
    inPerson: appointments.length - telemedicineCount,
    pendingNotesCount,
    statusBreakdown,
  };
}

// ── Calendar month highlight ─────────────────────────────────────────────────

/** Fetches every distinct calendar day this month that has an appointment. */
export async function fetchDemoCalendarMonth({
  practitionerId,
  orgId,
}: {
  practitionerId: number;
  orgId: string | null;
}): Promise<Date[]> {
  const now = new Date();
  const [page] = await listAppointmentsAction({
    payload: {
      practitioner_id: practitionerId,
      ...(orgId ? { org_id: orgId } : {}),
      start_from: startOfMonth(now).toISOString(),
      start_to: endOfMonth(now).toISOString(),
      limit: 200,
      offset: 0,
      sort: "date",
    },
  });

  const appointments = (page as TPaginatedAppointmentResponse | null)?.data ?? [];
  const dates = appointments
    .map((a: TAppointmentResponse) => (a.start ? new Date(a.start) : null))
    .filter((d): d is Date => d != null);

  // De-dupe by calendar day — several appointments can share a date.
  const seen = new Set<string>();
  return dates.filter((d) => {
    const key = d.toDateString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
