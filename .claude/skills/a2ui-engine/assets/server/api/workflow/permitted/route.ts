/**
 * GET /api/workflow/permitted
 *
 * Layer: app / api / workflow / permitted
 *
 * Returns the subset of registered workflows the current caller is allowed
 * to run, filtered by required_permissions against the resolved identity's
 * permissions array (with A2UI_AUTH_MODE=none, identity is always null and
 * every workflow with no required_permissions is returned — nothing is
 * gated until real auth is wired up).
 *
 * This endpoint is consumed by the WorkflowLauncher client component (the
 * "Workflows" tab) and by SessionGreeting's quick-start cards. Only lean
 * metadata is returned — no step definitions, resolver configs, or full
 * workflow JSON — so the response stays small regardless of workflow size.
 *
 * An optional `?type=chat|analysis` query param filters by
 * WorkflowDefinition.workflow_type, so the same registry can back multiple
 * launcher surfaces (a general chat page vs. an analysis-only dashboard
 * page) without duplicating any workflow metadata. `type=chat` matches
 * workflows explicitly tagged "chat" *and* those that omit the field
 * entirely (the default). `type=analysis` matches only workflows explicitly
 * tagged "analysis". Omitting the param returns every permitted workflow,
 * unfiltered.
 *
 * Response: { workflows: PermittedWorkflow[] }
 */

import { getIdentity } from "@/lib/a2ui/auth";
import { checkWorkflowPermission } from "@/lib/a2ui/checkWorkflowPermission";
import { WORKFLOW_ENTRIES } from "../_registry";

/** Lean workflow metadata returned to the launcher UI. */
export interface PermittedWorkflow {
  /** Stable identifier — sent back to POST /api/workflow as workflow_id. */
  id: string;
  name: string;
  description: string;
  tags: string[];
  /** Display category derived from the workflow file's folder. */
  category: string;
  required_permissions: string[];
  /** Which launcher surface this workflow belongs on — see WorkflowDefinition.workflow_type. */
  workflow_type: "chat" | "analysis";
}

/**
 * Returns the list of workflows the caller is permitted to run, optionally
 * filtered by launcher surface via `?type=chat|analysis`.
 *
 * @param request - Incoming request; reads the optional `type` search param.
 * @returns JSON body { workflows: PermittedWorkflow[] }.
 */
export async function GET(request: Request) {
  const identity = await getIdentity();
  const typeFilter = new URL(request.url).searchParams.get("type");

  const workflows: PermittedWorkflow[] = WORKFLOW_ENTRIES
    .filter(({ workflow }) => checkWorkflowPermission(identity, workflow).allowed)
    .filter(({ workflow }) => {
      if (typeFilter === "analysis") return workflow.workflow_type === "analysis";
      if (typeFilter === "chat") return workflow.workflow_type !== "analysis";
      return true;
    })
    .map(({ workflow, category }) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      tags: workflow.tags ?? [],
      category,
      required_permissions: workflow.required_permissions ?? [],
      workflow_type: workflow.workflow_type ?? "chat",
    }));

  return Response.json({ workflows });
}
