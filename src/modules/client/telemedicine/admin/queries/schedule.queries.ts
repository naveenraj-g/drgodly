/**
 * schedule.queries — TanStack Query keys and fetcher for Schedule data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * schedule data reference the same key shape. Mutations call
 * `queryClient.invalidateQueries({ queryKey: scheduleKeys.all })` to refresh
 * every list regardless of page/size.
 */

import {
  TPaginatedScheduleResponse,
  TScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { listSchedulesAction } from "@/modules/server/presentation/actions/schedule";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

// ── Query key factory ──────────────────────────────────────────────────────────

export const scheduleKeys = {
  /** Root key — invalidate this to wipe the entire schedule cache. */
  all: ["schedules"] as const,

  /** Parent key for all paginated list queries. */
  lists: () => [...scheduleKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache entry.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...scheduleKeys.lists(), params] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches one page of schedules via the server action and returns the
 * paginated response. Throws on error so TanStack Query can handle retries
 * and error state.
 *
 * fhir-gql's ListSchedulesSchema now supports an org_id filter (matches
 * Location) — results are server-side tenant-scoped.
 *
 * @param params - Pagination + tenant filter forwarded to the list action.
 * @returns The paginated schedule response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchSchedules(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedScheduleResponse> {
  const [data, err] = await listSchedulesAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      org_id: params.orgId ?? undefined,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load schedules");
  return data!;
}

/**
 * Fetches every schedule for the given tenant by looping the list action at
 * the maximum page size until all pages are retrieved. There is no
 * server-side "get all" endpoint for Schedule, so the ReferenceSelect picker
 * needs the complete flat list.
 *
 * @param orgId - Active organization ID to scope the fetch to the current tenant.
 * @returns Every schedule record for the tenant.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchAllSchedules(orgId: string | null): Promise<TScheduleResponse[]> {
  const PAGE_SIZE = 200;
  const all: TScheduleResponse[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [data, err] = await listSchedulesAction({
      payload: { limit: PAGE_SIZE, offset, org_id: orgId ?? undefined },
    });
    if (err) throw new Error(err.message ?? "Failed to load schedules");
    if (!data) break;

    all.push(...data.data);
    offset += PAGE_SIZE;
    if (data.data.length < PAGE_SIZE || offset >= data.total) break;
  }

  return all;
}

/**
 * Searches schedules by comment for the ReferenceSelect picker. Schedule has
 * no name field — `comment` is the closest thing to a display label, and
 * falls back to `Schedule #{id}` when empty so every record stays pickable.
 *
 * @param query - Search text; case-insensitive substring match on comment.
 * @param orgId - Active organization ID to scope results to the current tenant.
 * @returns Up to 50 matching schedules as {id, label} options.
 * @throws Error with the server action's error message on failure.
 */
export async function searchScheduleOptions(
  query: string,
  orgId: string | null,
): Promise<TReferenceOption[]> {
  const all = await fetchAllSchedules(orgId);
  const q = query.trim().toLowerCase();

  return all
    .filter((sch) => !q || (sch.comment ?? `Schedule #${sch.id}`).toLowerCase().includes(q))
    .slice(0, 50)
    .map((sch) => ({ id: sch.id, label: sch.comment || `Schedule #${sch.id}` }));
}
