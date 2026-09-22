/**
 * POST /api/workflow/step
 *
 * Layer: app / api / workflow / step
 *
 * Loads a specific step within an in-progress workflow session. Called by the
 * client after a successful form submission to advance to the next step, or
 * when the user skips an optional step.
 *
 * Authorization: with A2UI_AUTH_MODE=none (the default), every request is
 * allowed. With A2UI_AUTH_MODE=jwt, re-validates that the caller still holds
 * all required_permissions for the workflow (403 if missing) — the workflow
 * definition is re-sent by the client on every call, so this check is
 * repeated here as a defense-in-depth measure.
 *
 * No server-side workflow state is kept for the in-flight request — the
 * client re-sends the full WorkflowDefinition JSON along with the target
 * stepIndex and accumulated sessionContext on every call.
 *
 * Flow:
 *   1. Resolve identity via getIdentity().
 *   2. Check required_permissions on the re-sent workflow.
 *   3. Sort steps by sequence_number and look up the requested index.
 *   4. Obtain a bearer token (undefined when auth is disabled).
 *   5. If the step declares context_resolvers or a context_resolver, execute
 *      them to hydrate the latest resource state — each resolver's own
 *      `type` picks REST (the default) or GraphQL (resolver.type ===
 *      "graphql"); see runContextResolver() in ../_lib for the branch.
 *   6. Return the step definition + any fetched data.
 *
 * Request body:  { workflow: WorkflowDefinition, stepIndex: number, sessionContext?: Record<string, unknown> }
 * Response:      { type: "workflow_step", step, stepIndex, stepData, sessionContext }
 *             or { type: "error", message: string }
 */

import type { WorkflowDefinition } from "@/types/workflow";
import {
  getJWTToken,
  sortedSteps,
  runContextResolver,
  runContextResolvers,
  extractOutputs,
  buildBaseContext,
} from "../_lib";
import { WORKFLOW_REGISTRY } from "../_registry";
import { getIdentity } from "@/lib/a2ui/auth";
import { checkWorkflowPermission } from "@/lib/a2ui/checkWorkflowPermission";

/**
 * Advances the workflow to a specific step index and runs any context resolvers.
 *
 * @param req - POST request with { workflow, stepIndex, sessionContext? } body.
 * @returns The requested step with pre-fetched backend data and updated sessionContext.
 */
export async function POST(req: Request) {
  const identity = await getIdentity();

  const {
    workflow: clientWorkflow,
    stepIndex,
    sessionContext = {},
  }: {
    workflow: WorkflowDefinition;
    stepIndex: number;
    sessionContext?: Record<string, unknown>;
  } = await req.json();

  // Always prefer the registry's current workflow definition over the
  // client's snapshot. A workflow's context resolvers can be edited/added
  // after a session started, so the client's own copy (frozen at session
  // start) could be stale — the registry is the single source of truth.
  const workflow =
    WORKFLOW_REGISTRY.get(clientWorkflow.id)?.workflow ?? clientWorkflow;

  // Re-validate permissions on every step advance using the current definition.
  const permCheck = checkWorkflowPermission(identity, workflow);
  if (!permCheck.allowed) {
    return Response.json(
      {
        type: "error",
        message: "You do not have permission to run this workflow.",
        missing_permissions: permCheck.missing,
      },
      { status: 403 },
    );
  }

  const steps = sortedSteps(workflow.workflow_steps);

  // Advance past any steps whose skip_unless condition is not met in sessionContext.
  // This lets the client always request stepIndex N+1 and the server resolves which
  // step is actually shown, returning effectiveStepIndex so the client stays in sync.
  let effectiveStepIndex = stepIndex;
  while (effectiveStepIndex < steps.length) {
    const candidate = steps[effectiveStepIndex];
    if (!candidate.skip_unless) break; // no condition — always show this step
    const val = sessionContext[candidate.skip_unless];
    const isTruthy =
      val === true || val === "true" || val === 1 || val === "1";
    if (isTruthy) break; // condition met — show this step
    effectiveStepIndex++; // condition not met — try next step
  }

  // All remaining steps were skipped — workflow is complete.
  if (effectiveStepIndex >= steps.length) {
    return Response.json({ type: "workflow_complete" });
  }

  const step = steps[effectiveStepIndex];

  if (!step) {
    return Response.json({ type: "error", message: "Step not found" }, { status: 404 });
  }

  try {
    const token = await getJWTToken();
    let stepData: Record<string, unknown> = {};
    // Re-pin user_id/org_id/backend_url to the current identity on every
    // step advance — sessionContext is re-sent by the client on each call,
    // so without this a forged org_id/user_id from an earlier response
    // would ride along unchecked into this step's context resolvers.
    let mergedContext = buildBaseContext(sessionContext, identity);

    if (step.context_resolvers?.length) {
      stepData = await runContextResolvers(step.context_resolvers, mergedContext, token);
      const extracted = step.context?.outputs
        ? extractOutputs(step.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    } else if (step.context_resolver) {
      stepData = await runContextResolver(step.context_resolver, mergedContext, token);
      const extracted = step.context?.outputs
        ? extractOutputs(step.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    }

    return Response.json({
      type: "workflow_step",
      step,
      stepIndex: effectiveStepIndex,
      effectiveStepIndex,
      stepData,                   // empty object if no context resolver was declared
      sessionContext: mergedContext,
    });
  } catch (error) {
    console.error(`[workflow/step] Failed to load step ${stepIndex}:`, error);
    return Response.json({ type: "error", message: "Failed to load step" }, { status: 500 });
  }
}
