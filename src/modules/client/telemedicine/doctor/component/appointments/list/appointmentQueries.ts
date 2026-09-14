/**
 * Doctor appointment query keys and fetcher.
 *
 * Layer: client / telemedicine / doctor / appointments / list
 *
 * Centralises TanStack Query keys for the org-scoped appointment list so that
 * mutations can invalidate exactly the right cache entries.
 */

import { TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";

/**
 * Default server-side sort for the doctor appointment list — newest day
 * first, chronological (earliest time first) within each day. Uses the
 * independent `day`/`time-of-day` sort tokens (split out of the single
 * `start` timestamp) rather than the single `date` token, since "newest
 * day, but earliest-first within it" is a genuinely different compound
 * order than a plain single-field timestamp sort. Matches the Date/Time
 * columns' default header sort state (initialSorting in
 * DoctorAppointmentsTable) so the SSR-seeded page and the first client
 * render always agree on ordering.
 */
export const DEFAULT_APPOINTMENT_SORT = "-day,time-of-day";

// ── Query key factory ─────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for the doctor/practitioner appointment list.
 *
 * Hierarchy:
 *   all           → invalidates every doctor-appointment query
 *   lists()       → invalidates every list query
 *   list(params)  → invalidates one specific paginated page
 */
export const doctorAppointmentKeys = {
  /** Root key — invalidate this after any appointment mutation. */
  all: ["doctor-appointments"] as const,

  /** Parent key for all list queries. */
  lists: () => [...doctorAppointmentKeys.all, "list"] as const,

  /**
   * Key for one paginated page, scoped to the active org so different tenants
   * never share a cache entry.
   *
   * @param params - Pagination + tenant filter used in this fetch.
   */
  list: (params: {
    pageIndex: number;
    pageSize: number;
    orgId: string | null;
    practitionerId: number | null;
    status?: string;
    patientSearch?: string;
    startFrom?: string;
    startTo?: string;
    sort?: string;
  }) => [...doctorAppointmentKeys.lists(), params] as const,
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Fetches one page of appointments for the active organisation.
 * Throws on error so TanStack Query can handle retries and error state.
 *
 * @param params - Pagination and tenant filter forwarded to the list action.
 * @returns Paginated appointment response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchDoctorAppointments(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
  practitionerId: number | null;
  /** FHIR status code to filter by — undefined means "all statuses". */
  status?: string;
  /** Case-insensitive substring match on patient display name. */
  patientSearch?: string;
  /** ISO 8601 — return appointments starting at or after this datetime. */
  startFrom?: string;
  /** ISO 8601 — return appointments starting at or before this datetime. */
  startTo?: string;
  /** FHIR `_sort`-style string — defaults to DEFAULT_APPOINTMENT_SORT when omitted. */
  sort?: string;
}): Promise<TPaginatedAppointmentResponse> {
  const [data, err] = await listAppointmentsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      org_id: params.orgId ?? undefined,
      practitioner_id: params.practitionerId ?? undefined,
      sort: params.sort ?? DEFAULT_APPOINTMENT_SORT,
      // Only include filters when active
      ...(params.status ? { status: params.status } : {}),
      ...(params.patientSearch ? { patient_search: params.patientSearch } : {}),
      ...(params.startFrom ? { start_from: params.startFrom } : {}),
      ...(params.startTo ? { start_to: params.startTo } : {}),
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load appointments");
  return data!;
}
