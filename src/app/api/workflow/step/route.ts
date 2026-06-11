/**
 * POST /api/workflow/step
 *
 * Layer: app / api / workflow / step
 *
 * Loads a specific step within an in-progress workflow session. Called by the
 * client after a successful form submission to advance to the next step, or
 * when the user skips an optional step.
 *
 * No server-side workflow state is kept — the client re-sends the full
 * WorkflowDefinition JSON along with the target stepIndex and accumulated
 * sessionContext on every call.
 *
 * Flow:
 *   1. Sort steps by sequence_number and look up the requested index.
 *   2. Obtain a fresh JWT from Better Auth.
 *   3. If the step declares context_resolvers or a context_resolver, execute
 *      them against the FHIR server to hydrate the latest resource state.
 *   4. Return the step definition + any fetched data.
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
} from "../_lib";

/**
 * Advances the workflow to a specific step index and runs any context resolvers.
 *
 * @param req - POST request with { workflow, stepIndex, sessionContext? } body.
 * @returns The requested step with pre-fetched FHIR data and updated sessionContext.
 */
export async function POST(req: Request) {
  const {
    workflow,
    stepIndex,
    sessionContext = {},
  }: {
    workflow: WorkflowDefinition;
    stepIndex: number;
    sessionContext?: Record<string, unknown>;
  } = await req.json();

  const steps = sortedSteps(workflow.workflow_steps);
  const step = steps[stepIndex];

  if (!step) {
    return Response.json({ type: "error", message: "Step not found" }, { status: 404 });
  }

  try {
    const token = await getJWTToken();
    let stepData: Record<string, unknown> = {};
    let mergedContext = { ...sessionContext };

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
      stepIndex,
      stepData,                   // empty object if no context resolver was declared
      sessionContext: mergedContext,
    });
  } catch (error) {
    console.error(`[workflow/step] Failed to load step ${stepIndex}:`, error);
    return Response.json({ type: "error", message: "Failed to load step" }, { status: 500 });
  }
}
