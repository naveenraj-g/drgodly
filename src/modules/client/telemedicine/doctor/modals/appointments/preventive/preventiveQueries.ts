/**
 * Query keys and fetchers for the preventive-appointment confirm dialog.
 *
 * Layer: client / telemedicine / doctor / modals / appointments / preventive
 *
 * Both fetchers go through server actions that inject the session org_id, so
 * the dialog only ever sees plans / activities of the doctor's active organisation.
 */

import type { TPlanDefinitionResponse } from "@/modules/entities/schemas/plan-definition";
import type { TActivityDefinitionResponse } from "@/modules/entities/schemas/activity-definition";
import { listPlanDefinitionsAction } from "@/modules/server/presentation/actions/plan-definition";
import { listActivityDefinitionsAction } from "@/modules/server/presentation/actions/activity-definition";

/** TanStack Query keys for this dialog. */
export const preventiveKeys = {
  plans: ["preventive-active-plan-definitions"] as const,
  activities: ["preventive-activity-definitions"] as const,
};

/**
 * Fetches the organisation's ACTIVE plan definitions (draft / retired plans
 * must not be applied to patients, and the server rejects them anyway).
 *
 * @returns Active plan definitions (up to 200).
 * @throws Error when the server action fails.
 */
export async function fetchActivePlanDefinitions(): Promise<TPlanDefinitionResponse[]> {
  const [page, err] = await listPlanDefinitionsAction({
    payload: { status: "active", limit: 200 },
  });
  if (err) throw new Error(err.message);
  return page?.data ?? [];
}

/**
 * Fetches the organisation's activity definitions as an id → record map, used
 * to show readable names for each plan action's `definition_canonical`
 * (e.g. "ActivityDefinition/12").
 *
 * @returns Map keyed by ActivityDefinition id.
 * @throws Error when the server action fails.
 */
export async function fetchActivityDefinitionMap(): Promise<
  Record<number, TActivityDefinitionResponse>
> {
  const [page, err] = await listActivityDefinitionsAction({ payload: { limit: 200 } });
  if (err) throw new Error(err.message);
  return Object.fromEntries((page?.data ?? []).map((a: TActivityDefinitionResponse) => [a.id, a]));
}

/**
 * Extracts the ActivityDefinition id from an action's canonical reference.
 *
 * @param canonical - e.g. "ActivityDefinition/12" or ".../ActivityDefinition/12".
 * @returns The numeric id, or null when the reference is not parseable.
 */
export function parseActivityDefinitionId(canonical?: string | null): number | null {
  const match = canonical?.match(/ActivityDefinition\/(\d+)/);
  return match ? Number(match[1]) : null;
}
