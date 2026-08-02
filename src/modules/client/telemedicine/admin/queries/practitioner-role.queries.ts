/**
 * practitioner-role.queries — TanStack Query fetcher for PractitionerRole data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * PractitionerRole has no admin table screen yet (fast-follow, not built this
 * session) — this file exists solely to back the ReferenceSelect picker used
 * by Schedule's `practitioner_roles[]` actor sub-group. Only what that picker
 * needs is here: a tenant-scoped fetch-all helper (fhir-gql's
 * ListPractitionerRolesSchema has no name/text search filter) plus a thin
 * search wrapper that filters client-side.
 */

import {
  TPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";
import { listPractitionerRolesAction } from "@/modules/server/presentation/actions/practitioner-role";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

/**
 * Fetches every practitioner role for the given tenant by looping the list
 * action at the maximum page size until all pages are retrieved. Same
 * loop-until-exhausted pattern as `fetchAllLocations`/`fetchAllOrganizations`.
 *
 * @param orgId - Active organization ID to scope the fetch to the current tenant.
 * @returns Every practitioner role record for the tenant.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchAllPractitionerRoles(
  orgId: string | null,
): Promise<TPractitionerRoleResponse[]> {
  const PAGE_SIZE = 200;
  const all: TPractitionerRoleResponse[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [data, err] = await listPractitionerRolesAction({
      payload: { limit: PAGE_SIZE, offset, org_id: orgId ?? undefined },
    });
    if (err) throw new Error(err.message ?? "Failed to load practitioner roles");
    if (!data) break;

    all.push(...data.data);
    offset += PAGE_SIZE;
    if (data.data.length < PAGE_SIZE || offset >= data.total) break;
  }

  return all;
}

/**
 * Searches practitioner roles by practitioner name for the ReferenceSelect
 * picker, scoped to the given tenant. fhir-gql's list endpoint has no name
 * filter, so this reuses `fetchAllPractitionerRoles` and filters client-side.
 *
 * Label is composed as "{practitioner name} — {role}" when a role code is
 * present, since PractitionerRole itself has no name of its own.
 *
 * @param query - Search text; case-insensitive substring match on practitioner_display.
 * @param orgId - Active organization ID to scope results to the current tenant.
 * @returns Up to 50 matching practitioner roles as {id, label} options.
 * @throws Error with the server action's error message on failure.
 */
export async function searchPractitionerRoleOptions(
  query: string,
  orgId: string | null,
): Promise<TReferenceOption[]> {
  const all = await fetchAllPractitionerRoles(orgId);
  const q = query.trim().toLowerCase();

  return all
    .filter((role) => !q || (role.practitioner_display ?? "").toLowerCase().includes(q))
    .slice(0, 50)
    .map((role) => {
      const name = role.practitioner_display ?? `PractitionerRole #${role.id}`;
      const roleLabel = role.code?.[0]?.coding_display;
      return { id: role.id, label: roleLabel ? `${name} — ${roleLabel}` : name };
    });
}
