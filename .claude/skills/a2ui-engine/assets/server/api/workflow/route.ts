/**
 * POST /api/workflow
 *
 * Layer: app / api / workflow
 *
 * Entry point for the workflow system. Supports two trigger modes:
 *
 *   Agent mode   — { message: string }
 *     Forwards the user's message to an external AI agent (A2UI_AGENT_URL),
 *     which selects the appropriate workflow and returns its definition as
 *     JSON. The permitted workflow IDs are injected into the request so the
 *     agent can only suggest workflows the caller is allowed to run. This
 *     mode is optional — the engine ships no agent of its own; set
 *     A2UI_AGENT_URL to your own NL-intent-matching service if you want
 *     free-text chat to trigger workflows. Without it, only direct mode works.
 *
 *   Direct mode  — { workflow_id: string }
 *     Bypasses the agent entirely. The workflow is looked up by ID in the
 *     local registry. Used by the launcher UI and the greeting's quick-start
 *     cards when the user clicks a workflow — works with no agent configured.
 *
 * Both modes converge at the same permission check, step resolution, and
 * context resolver execution before returning the first step to the client.
 *
 * Authorization: with A2UI_AUTH_MODE=none (the default), every request is
 * allowed and getIdentity() returns null. With A2UI_AUTH_MODE=jwt, resolves
 * the caller's identity and checks the resolved workflow's
 * required_permissions[] against it (403 if any are missing).
 *
 * Flow:
 *   1. Resolve identity — via getIdentity() (see lib/a2ui/auth).
 *   2. Resolve workflow — via agent (message) or registry (workflow_id).
 *   3. Obtain a bearer token for downstream backend calls (undefined when auth is disabled).
 *   4. Check that the caller holds all required_permissions for the workflow.
 *   5. Sort workflow_steps by sequence_number and take step[0].
 *   6. If the first step declares a context_resolver / context_resolvers, run
 *      them now so the client receives pre-fetched data with the step.
 *   7. Return the full workflow object + first step to the client.
 *
 * No server-side workflow state is kept for the in-flight request — the full
 * workflow JSON travels back to the client and is re-sent with each
 * subsequent /step and /submit call. (Persisted history for the sidebar is a
 * separate concern — see lib/a2ui/session-store.)
 *
 * Request body:  { message?: string, workflow_id?: string, sessionContext?: Record<string, unknown> }
 * Response:      { type: "workflow_step", workflow, stepIndex, step, stepData, sessionContext }
 *             or { type: "error", message: string, missing_permissions?: string[] }
 */

import type { WorkflowDefinition } from "@/types/workflow";
import {
  getJWTToken,
  sortedSteps,
  runContextResolver,
  runContextResolvers,
  extractOutputs,
  buildBaseContext,
} from "./_lib";
import { getIdentity } from "@/lib/a2ui/auth";
import { checkWorkflowPermission } from "@/lib/a2ui/checkWorkflowPermission";
import { WORKFLOW_REGISTRY, WORKFLOW_ENTRIES } from "./_registry";

/** Optional — free-text agent mode is disabled entirely when unset. */
const AGENT_API_URL = process.env.A2UI_AGENT_URL;

/**
 * Starts a new workflow session.
 *
 * @param req - POST request with { message?, workflow_id?, sessionContext? } body.
 * @returns First workflow step with pre-fetched context data, or an error response.
 */
export async function POST(req: Request) {
  const {
    message,
    workflow_id,
    sessionContext = {},
  }: {
    message?: string;
    workflow_id?: string;
    sessionContext?: Record<string, unknown>;
  } = await req.json();

  const hasMessage = Boolean(message?.trim());
  const hasWorkflowId = Boolean(workflow_id?.trim());

  if (!hasMessage && !hasWorkflowId) {
    return Response.json(
      { type: "error", message: "Provide either message or workflow_id" },
      { status: 400 },
    );
  }

  if (hasMessage && !hasWorkflowId && !AGENT_API_URL) {
    return Response.json(
      {
        type: "error",
        message:
          "Free-text agent mode is not configured — set A2UI_AGENT_URL, or trigger a workflow by id instead.",
      },
      { status: 501 },
    );
  }

  const identity = await getIdentity();

  try {
    // Token is needed for agent calls (auth header) and context resolver
    // backend calls — fetch once upfront so both paths share it. Undefined
    // when auth is disabled; downstream calls simply omit the header.
    const token = await getJWTToken();

    let workflow: WorkflowDefinition;

    if (hasWorkflowId) {
      // ── Direct mode: look up workflow in local registry ───────────────────
      const entry = WORKFLOW_REGISTRY.get(workflow_id!.trim());
      if (!entry) {
        return Response.json(
          { type: "error", message: `Unknown workflow: ${workflow_id}` },
          { status: 404 },
        );
      }
      workflow = entry.workflow;
    } else {
      // ── Agent mode: forward message to your AI agent ──────────────────────
      // Compute the permitted workflow IDs for this caller so the agent can
      // filter its suggestions to only workflows the user is allowed to run.
      const permittedIds = WORKFLOW_ENTRIES
        .filter(({ workflow: w }) => checkWorkflowPermission(identity, w).allowed)
        .map(({ workflow: w }) => w.id);

      const agentRes = await fetch(AGENT_API_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: message,
          session_id:
            (sessionContext.session_id as string | undefined) ??
            crypto.randomUUID(),
          // Permitted workflow IDs injected so the agent only recommends
          // workflows this user is authorised to run (defense in depth).
          permitted_workflow_ids: permittedIds,
        }),
        cache: "no-store",
      });

      if (!agentRes.ok) throw new Error(`Agent API error: ${agentRes.status}`);
      workflow = await agentRes.json();
    }

    // ── Permission check (both modes) ────────────────────────────────────────
    // Re-check even in direct mode: the registry lookup above only finds the
    // workflow; the permission gate ensures the caller holds the required grants.
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

    // ── Step resolution ───────────────────────────────────────────────────────
    const steps = sortedSteps(workflow.workflow_steps);
    const firstStep = steps[0];

    if (!firstStep) {
      return Response.json(
        { type: "error", message: "Workflow has no steps" },
        { status: 500 },
      );
    }

    let stepData: Record<string, unknown> = {};
    let mergedContext = buildBaseContext(sessionContext, identity);

    if (firstStep.context_resolvers?.length) {
      stepData = await runContextResolvers(firstStep.context_resolvers, mergedContext, token);
      const extracted = firstStep.context?.outputs
        ? extractOutputs(firstStep.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    } else if (firstStep.context_resolver) {
      stepData = await runContextResolver(firstStep.context_resolver, mergedContext, token);
      const extracted = firstStep.context?.outputs
        ? extractOutputs(firstStep.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    }

    return Response.json({
      type: "workflow_step",
      workflow, // full definition — client caches this for the whole session
      stepIndex: 0,
      step: firstStep,
      stepData, // pre-fetched backend data for the first step, if any
      sessionContext: mergedContext,
    });
  } catch (error) {
    console.error("[workflow] Failed to start workflow:", error);
    return Response.json(
      { type: "error", message: "Failed to start workflow" },
      { status: 500 },
    );
  }
}
