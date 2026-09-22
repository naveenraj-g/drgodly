/**
 * a2ui/session-actions — server actions the chat container's hooks call.
 *
 * Layer: server / a2ui
 *
 * Thin zsa wrappers around ./store (the active SessionStore implementation).
 * These are the only names the client hooks import — session persistence is
 * an implementation detail behind them, so swapping session-store.ts's
 * backing implementation never requires touching a client file.
 *
 * When A2UI_AUTH_MODE=jwt, the resolved identity's userId always wins over
 * whatever the client sent — the client-supplied value is convenience state
 * for an unauthenticated dev setup, not something to trust once there's a
 * real session to check against.
 */

"use server";

import { z } from "zod";
import { createServerAction } from "zsa";
import { getIdentity } from "./auth";
import { sessionStore } from "./store";

/** Resolves the effective userId: session identity wins when auth is enabled. */
async function resolveUserId(payloadUserId: string): Promise<string> {
  const identity = await getIdentity();
  return identity?.userId ?? payloadUserId;
}

const WorkflowStatusSchema = z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED", "ERROR"]);

export const listSessionsAction = createServerAction()
  .input(z.object({ payload: z.object({ userId: z.string(), limit: z.number().optional() }) }))
  .handler(async ({ input }) => {
    const userId = await resolveUserId(input.payload.userId);
    return sessionStore.listSessions(userId, input.payload.limit ?? 50);
  });

export const createSessionAction = createServerAction()
  .input(
    z.object({
      payload: z.object({
        userId: z.string(),
        orgId: z.string().optional(),
        title: z.string().optional(),
      }),
    }),
  )
  .handler(async ({ input }) => {
    const userId = await resolveUserId(input.payload.userId);
    return sessionStore.createSession({ ...input.payload, userId });
  });

/**
 * Server-side helper for a [sessionId] page to pre-load a session before
 * render — not a zsa action (nothing client-side calls this directly).
 * Scoped to userId so a forged sessionId in the URL can't leak another
 * user's session.
 */
export async function getSession(sessionId: string, userId: string) {
  const resolvedUserId = await resolveUserId(userId);
  const detail = await sessionStore.getSessionDetail(sessionId, resolvedUserId);
  if (!detail) throw new Error(`Session ${sessionId} not found`);
  return detail;
}

export const deleteSessionAction = createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    await sessionStore.deleteSession(input.id);
  });

export const renameSessionAction = createServerAction()
  .input(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ input }) => {
    await sessionStore.renameSession(input.id, input.title);
  });

export const pinSessionAction = createServerAction()
  .input(z.object({ id: z.string(), pinned: z.boolean() }))
  .handler(async ({ input }) => {
    await sessionStore.pinSession(input.id, input.pinned);
  });

export const addMessageAction = createServerAction()
  .input(
    z.object({
      payload: z.object({
        sessionId: z.string(),
        role: z.enum(["USER", "ASSISTANT"]),
        content: z.string(),
        type: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    }),
  )
  .handler(async ({ input }) => {
    const { sessionId, type, ...rest } = input.payload;
    return sessionStore.addMessage(sessionId, { type: type ?? "TEXT", ...rest });
  });

export const createWorkflowStateAction = createServerAction()
  .input(
    z.object({
      payload: z.object({
        sessionId: z.string(),
        workflowId: z.string(),
        workflowName: z.string(),
        workflowDefinition: z.unknown(),
        sessionContext: z.record(z.string(), z.unknown()),
        totalSteps: z.number().optional(),
      }),
    }),
  )
  .handler(async ({ input }) => {
    const { sessionId, workflowId, workflowName, workflowDefinition, sessionContext, totalSteps } =
      input.payload;
    return sessionStore.createWorkflowState({
      sessionId,
      workflowId,
      workflowName,
      workflowDefinition,
      sessionContext,
      totalSteps,
    });
  });

export const updateWorkflowStateAction = createServerAction()
  .input(
    z.object({
      id: z.string(),
      payload: z.object({
        currentStepIndex: z.number().optional(),
        sessionContext: z.record(z.string(), z.unknown()).optional(),
        status: WorkflowStatusSchema.optional(),
      }),
    }),
  )
  .handler(async ({ input }) => {
    const patch = {
      ...input.payload,
      ...(input.payload.status === "COMPLETED" ? { completedAt: new Date() } : {}),
    };
    return sessionStore.updateWorkflowState(input.id, patch);
  });

export const addStepSubmissionAction = createServerAction()
  .input(
    z.object({
      payload: z.object({
        workflowStateId: z.string(),
        stepIndex: z.number(),
        stepId: z.string(),
        stepName: z.string(),
        actionName: z.string().optional(),
        formData: z.unknown().optional(),
        responseData: z.unknown().optional(),
        extractedOutputs: z.unknown().optional(),
      }),
    }),
  )
  .handler(async ({ input }) => {
    const { workflowStateId, ...rest } = input.payload;
    return sessionStore.addStepSubmission(workflowStateId, rest);
  });
