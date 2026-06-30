/**
 * POST /api/workflow
 *
 * Layer: app / api / workflow
 *
 * Entry point for the workflow system. Receives a plain-text user message,
 * forwards it to the external AI agent, and returns the first step of the
 * workflow that the agent selected.
 *
 * Authorization:
 *   - Requires an authenticated Better Auth session (401 if absent).
 *   - Checks that the resolved workflow's required_permissions[] are all
 *     present in session.session.permissions (403 if any are missing).
 *
 * Flow:
 *   1. Validate session — reject unauthenticated callers immediately.
 *   2. Obtain a short-lived JWT from Better Auth (forwarding the session cookie).
 *   3. POST the user message to AGENT_API_URL with Bearer auth.
 *      The agent interprets intent and returns a WorkflowDefinition JSON.
 *   4. Check that the caller holds all required_permissions for the workflow.
 *   5. Sort workflow_steps by sequence_number and take step[0].
 *   6. If the first step declares a context_resolver / context_resolvers, run
 *      them now so the client receives pre-fetched FHIR data with the step.
 *   7. Return the full workflow object + first step to the client.
 *      The client stores the workflow in Zustand and renders the step.
 *
 * No server-side workflow state is kept — the full workflow JSON travels back
 * to the client and is re-sent with each subsequent /step and /submit call.
 *
 * Request body:  { message: string, sessionContext?: Record<string, unknown> }
 * Response:      { type: "workflow_step", workflow, stepIndex, step, stepData, sessionContext }
 *             or { type: "error", message: string }
 */

import type { WorkflowDefinition } from "@/types/workflow";
import {
  getJWTToken,
  sortedSteps,
  runContextResolver,
  runContextResolvers,
  extractOutputs,
} from "./_lib";
import { getServerSession } from "@/modules/server/auth/get-session";
import { checkWorkflowPermission } from "@/modules/server/shared/auth/checkWorkflowPermission";

// ** Testing — replace with live agent call when AGENT_API_URL is wired up **
import create_patient_workflow from "@/modules/client/ai-hub/workflows/patient/create_patient.json";
import view_vitals_dashboard from "@/modules/client/ai-hub/workflows/vitals/view_vitals_dashboard.json";
import view_vitals_table from "@/modules/client/ai-hub/workflows/vitals/view_vitals_table.json";
import book_appointment from "@/modules/client/ai-hub/workflows/appointment/book_appointment.json";
import create_organization from "@/modules/client/ai-hub/workflows/organization/create_organization.json";
import create_healthcare_service from "@/modules/client/ai-hub/workflows/healthcare_service/create_healthcare_service.json";
import create_practitioner from "@/modules/client/ai-hub/workflows/practitioner/create_practitioner.json";
import create_schedule_with_slots from "@/modules/client/ai-hub/workflows/schedule/create_schedule_with_slots.json";
import create_service_request from "@/modules/client/ai-hub/workflows/orders/create_service_request.json";
import upload_practitioner_photo from "@/modules/client/ai-hub/workflows/practitioner/upload_practitioner_photo.json";

// Suppress unused-variable warnings while the agent integration is in development.
void create_patient_workflow;
void view_vitals_dashboard;
void view_vitals_table;
void book_appointment;
void create_organization;
void create_healthcare_service;
void create_practitioner;
void create_schedule_with_slots;
void upload_practitioner_photo;

const AGENT_API_URL = process.env.AGENT_API_URL!;
// Suppress unused warning — will be used once agent integration is live.
void AGENT_API_URL;

/**
 * Starts a new workflow session.
 *
 * @param req - POST request with { message, sessionContext? } body.
 * @returns First workflow step with pre-fetched context data.
 */
export async function POST(req: Request) {
  const {
    message,
    sessionContext = {},
  }: { message: string; sessionContext?: Record<string, unknown> } =
    await req.json();

  if (!message?.trim()) {
    return Response.json(
      { type: "error", message: "Empty message" },
      { status: 400 },
    );
  }

  // Require an authenticated session before doing any work.
  const authSession = await getServerSession();
  if (!authSession?.user) {
    return Response.json(
      { type: "error", message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const token = await getJWTToken();

    // TODO: Replace the hardcoded workflow with the live agent call below once
    //       AGENT_API_URL is configured and the agent is deployed.
    //
    // const agentRes = await fetch(AGENT_API_URL, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${token}`,
    //   },
    //   body: JSON.stringify({
    //     query: message,
    //     session_id:
    //       (sessionContext.session_id as string | undefined) ?? crypto.randomUUID(),
    //   }),
    //   cache: "no-store",
    // });
    // if (!agentRes.ok) throw new Error(`Agent API error: ${agentRes.status}`);
    // const workflow: WorkflowDefinition = await agentRes.json();

    // ** Testing **
    const workflow: WorkflowDefinition =
      create_patient_workflow as unknown as WorkflowDefinition;

    // Enforce permission-based access control. The workflow's required_permissions[]
    // must all be present in the session before we reveal any step data to the client.
    const permCheck = checkWorkflowPermission(authSession, workflow);
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
    const firstStep = steps[0];

    if (!firstStep) {
      return Response.json(
        { type: "error", message: "Workflow has no steps" },
        { status: 500 },
      );
    }

    let stepData: Record<string, unknown> = {};
    let mergedContext: Record<string, unknown> = {
      ...sessionContext,
      // Seed identity values so every workflow step can use $user_id / $org_id in
      // URLs and validation schemas without asking the user to enter them manually.
      ...(authSession?.user?.id ? { user_id: authSession.user.id } : {}),
      ...(authSession?.session?.activeOrganizationId
        ? { org_id: authSession.session.activeOrganizationId }
        : {}),
    };

    if (firstStep.context_resolvers?.length) {
      stepData = await runContextResolvers(
        firstStep.context_resolvers,
        mergedContext,
        token,
      );
      const extracted = firstStep.context?.outputs
        ? extractOutputs(firstStep.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    } else if (firstStep.context_resolver) {
      stepData = await runContextResolver(
        firstStep.context_resolver,
        mergedContext,
        token,
      );
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
      stepData, // pre-fetched FHIR data for the first step, if any
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
