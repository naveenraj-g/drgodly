/**
 * checkWorkflowPermission.ts
 *
 * Layer: server / a2ui
 *
 * Compares the permission strings declared on a WorkflowDefinition against
 * the identity resolved by getIdentity() (see ./auth). Stateless — safe to
 * call from any route handler.
 *
 * With A2UI_AUTH_MODE=none, getIdentity() always returns null and every
 * workflow is allowed regardless of required_permissions — there is no
 * identity to check permissions against, so gating on it would just lock
 * everyone out. Permission enforcement only activates once real auth
 * (A2UI_AUTH_MODE=jwt) is wired up.
 */

import type { A2uiIdentity } from "./auth";
import type { WorkflowDefinition } from "@/types/workflow";

export interface WorkflowPermissionResult {
  /** True when the caller holds every required permission for the workflow. */
  allowed: boolean;
  /** The permissions the caller is missing. Empty when allowed is true. */
  missing: string[];
}

/**
 * Checks whether the given identity holds all permissions required by a
 * workflow definition.
 *
 * @param identity - Resolved caller identity, or null (unauthenticated / auth disabled).
 * @param workflow - The WorkflowDefinition to check against.
 * @returns An object with `allowed` and `missing` fields.
 */
export function checkWorkflowPermission(
  identity: A2uiIdentity | null,
  workflow: WorkflowDefinition,
): WorkflowPermissionResult {
  const required = workflow.required_permissions ?? [];

  if (required.length === 0 || identity === null) {
    return { allowed: true, missing: [] };
  }

  const held = new Set(identity.permissions ?? []);
  const missing = required.filter((p) => !held.has(p));

  return { allowed: missing.length === 0, missing };
}
