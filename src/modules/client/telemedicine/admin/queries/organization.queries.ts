/**
 * organization.queries — TanStack Query keys and fetcher for Organization data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Centralising query keys here means all components that read or invalidate
 * organization data reference the same key shape — no string literals scattered
 * across files. Mutations call `queryClient.invalidateQueries({ queryKey:
 * organizationKeys.all })` to refresh every list regardless of page/size.
 */

import { TPaginatedOrgResponse } from "@/modules/entities/schemas/organization";
import { listOrganizationsAction } from "@/modules/server/presentation/actions/organization";

// ── Query key factory ──────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for Organization queries.
 *
 * Hierarchy:
 *   all                          → invalidates everything org-related
 *   lists                        → invalidates all list queries
 *   list({ pageIndex, pageSize }) → invalidates one specific page
 *
 * @example
 * // Invalidate every org query after a mutation:
 * queryClient.invalidateQueries({ queryKey: organizationKeys.all })
 *
 * // Invalidate just the list queries:
 * queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
 */
export const organizationKeys = {
  /** Root key — invalidate this to wipe the entire org cache. */
  all: ["organizations"] as const,

  /** Parent key for all list queries. */
  lists: () => [...organizationKeys.all, "list"] as const,

  /**
   * Key for one paginated list fetch.
   * `orgId` is included so fetches for different tenants never share a cache entry.
   * @param params - Pagination params + tenant org ID.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null }) =>
    [...organizationKeys.lists(), params] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches one page of organizations via the server action and returns the
 * paginated response. Throws on error so TanStack Query can handle retries
 * and error state.
 *
 * @param params - Pagination + tenant filter forwarded to the list action.
 * @param params.pageIndex - Zero-based page index.
 * @param params.pageSize  - Number of rows per page.
 * @param params.orgId     - Active organization ID to scope results to the current tenant.
 * @returns The paginated org response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchOrganizations(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
}): Promise<TPaginatedOrgResponse> {
  const [data, err] = await listOrganizationsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      // Scope results to the current tenant; undefined is omitted by axios.
      org_id: params.orgId ?? undefined,
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load organizations");
  return data!;
}
