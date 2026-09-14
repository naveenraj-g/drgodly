/**
 * Patient appointment query keys and fetcher.
 *
 * Layer: client / telemedicine / patient / appointments / list
 *
 * Centralises TanStack Query keys for the patient's own appointment list so
 * that mutations can invalidate exactly the right cache entries without
 * scattering string literals across files.
 */

import { TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";
import { getMyAppointmentsAction } from "@/modules/server/presentation/actions/appointment";

/**
 * Default server-side sort for the patient appointment list — newest day
 * first, chronological (earliest time first) within each day. Uses the
 * independent `day`/`time-of-day` sort tokens (split out of the single
 * `start` timestamp) rather than the single `date` token, since "newest
 * day, but earliest-first within it" is a genuinely different compound
 * order than a plain single-field timestamp sort — mirrors the doctor
 * appointment list's DEFAULT_APPOINTMENT_SORT. Matches the Date/Time
 * columns' default header sort state (initialSorting in
 * PatientAppointmentsTable) so the SSR-seeded page and the first client
 * render always agree on ordering.
 */
export const DEFAULT_APPOINTMENT_SORT = "-day,time-of-day";

// ── Query key factory ─────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for the patient appointment list.
 *
 * Hierarchy:
 *   all           → invalidates every patient-appointment query
 *   lists()       → invalidates every list query
 *   list(params)  → invalidates one specific paginated page + filter combo
 */
export const patientAppointmentKeys = {
  /** Root key — invalidate this after any appointment mutation. */
  all: ["patient-appointments"] as const,

  /** Parent key for all list queries. */
  lists: () => [...patientAppointmentKeys.all, "list"] as const,

  /**
   * Key for one paginated page with active filters.
   * Including `status` means the cache is scoped per filter value — changing
   * the status filter triggers a fresh fetch rather than reusing stale data.
   *
   * @param params - Pagination + filter params used in this fetch.
   */
  list: (params: {
    pageIndex: number;
    pageSize: number;
    status?: string;
    practitionerSearch?: string;
    startFrom?: string;
    startTo?: string;
    sort?: string;
  }) => [...patientAppointmentKeys.lists(), params] as const,
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Fetches one page of the authenticated patient's own appointments.
 * Throws on error so TanStack Query can handle retries and error state.
 *
 * @param params - Pagination and filter params forwarded to the list action.
 * @returns Paginated appointment response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchMyAppointments(params: {
  pageIndex: number;
  pageSize: number;
  /** FHIR status code to filter by — undefined means "all statuses". */
  status?: string;
  /** Case-insensitive substring match on doctor display name. */
  practitionerSearch?: string;
  /** ISO 8601 — return appointments starting at or after this datetime. */
  startFrom?: string;
  /** ISO 8601 — return appointments starting at or before this datetime. */
  startTo?: string;
  /** FHIR `_sort`-style string — defaults to DEFAULT_APPOINTMENT_SORT when omitted. */
  sort?: string;
}): Promise<TPaginatedAppointmentResponse> {
  const [data, err] = await getMyAppointmentsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      sort: params.sort ?? DEFAULT_APPOINTMENT_SORT,
      // Only include filters when active
      ...(params.status ? { status: params.status } : {}),
      ...(params.practitionerSearch
        ? { practitioner_search: params.practitionerSearch }
        : {}),
      ...(params.startFrom ? { start_from: params.startFrom } : {}),
      ...(params.startTo ? { start_to: params.startTo } : {}),
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load appointments");
  return data!;
}
