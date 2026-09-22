/**
 * memory-session-store — default zero-setup SessionStore implementation.
 *
 * Layer: server / a2ui
 *
 * Keeps everything in a module-level Map, so it survives across requests
 * within one running server process but resets on restart/redeploy. That's
 * the right tradeoff for local development or a demo — no database required
 * to try the engine end to end. Swap in a real implementation (Prisma,
 * Drizzle, whatever) by writing a class that implements SessionStore and
 * pointing store.ts at it — see ../../references/persistence-prisma-example.md.
 */

import { randomUUID } from "crypto";
import type {
  SessionStore,
  SessionRow,
  MessageRow,
  WorkflowStateRow,
  StepSubmissionRow,
  SessionWithDetail,
} from "./session-store";

/** Fields stored internally but derived (not stored) on the public SessionRow. */
type StoredSession = Omit<SessionRow, "messageCount" | "hasActiveWorkflow" | "workflows"> & {
  messages: MessageRow[];
  workflowStates: WorkflowStateRow[];
};

const sessions = new Map<string, StoredSession>();

/** Computes the derived summary fields (messageCount, hasActiveWorkflow, workflows) for a row. */
function toPublicRow(session: StoredSession): SessionRow {
  const { messages, workflowStates, ...base } = session;
  return {
    ...base,
    messageCount: messages.length,
    hasActiveWorkflow: workflowStates.some((w) => w.status === "IN_PROGRESS"),
    workflows: workflowStates.map((w) => ({
      id: w.id,
      workflowName: w.workflowName,
      status: w.status,
    })),
  };
}

export class MemorySessionStore implements SessionStore {
  async listSessions(userId: string, limit: number): Promise<SessionRow[]> {
    return [...sessions.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
      .map(toPublicRow);
  }

  async createSession(input: { userId: string; orgId?: string; title?: string }): Promise<SessionRow> {
    const now = new Date();
    const session: StoredSession = {
      id: randomUUID(),
      userId: input.userId,
      orgId: input.orgId ?? null,
      title: input.title ?? "New chat",
      pinned: false,
      createdAt: now,
      updatedAt: now,
      messages: [],
      workflowStates: [],
    };
    sessions.set(session.id, session);
    return toPublicRow(session);
  }

  async getSessionDetail(id: string, userId: string): Promise<SessionWithDetail | null> {
    const session = sessions.get(id);
    if (!session || session.userId !== userId) return null;

    const active = session.workflowStates.find((w) => w.status === "IN_PROGRESS") ?? null;
    const completed = session.workflowStates.filter((w) => w.status !== "IN_PROGRESS");

    return {
      session: toPublicRow(session),
      messages: session.messages,
      activeWorkflow: active,
      completedWorkflows: completed,
    };
  }

  async deleteSession(id: string): Promise<void> {
    sessions.delete(id);
  }

  async renameSession(id: string, title: string): Promise<void> {
    const session = sessions.get(id);
    if (session) {
      session.title = title;
      session.updatedAt = new Date();
    }
  }

  async pinSession(id: string, pinned: boolean): Promise<void> {
    const session = sessions.get(id);
    if (session) {
      session.pinned = pinned;
      session.updatedAt = new Date();
    }
  }

  async addMessage(
    sessionId: string,
    message: Omit<MessageRow, "id" | "sessionId" | "createdAt">,
  ): Promise<MessageRow> {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const row: MessageRow = {
      id: randomUUID(),
      sessionId,
      createdAt: new Date(),
      ...message,
    };
    session.messages.push(row);
    session.updatedAt = new Date();
    return row;
  }

  async createWorkflowState(input: {
    sessionId: string;
    workflowId: string;
    workflowName: string;
    workflowDefinition: unknown;
    sessionContext: Record<string, unknown>;
  }): Promise<WorkflowStateRow> {
    const session = sessions.get(input.sessionId);
    if (!session) throw new Error(`Session ${input.sessionId} not found`);

    const row: WorkflowStateRow = {
      id: randomUUID(),
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowName: input.workflowName,
      workflowDefinition: input.workflowDefinition,
      sessionContext: input.sessionContext,
      currentStepIndex: 0,
      status: "IN_PROGRESS",
      stepSubmissions: [],
      completedAt: null,
      updatedAt: new Date(),
    };
    session.workflowStates.push(row);
    return row;
  }

  async updateWorkflowState(
    id: string,
    patch: Partial<
      Pick<WorkflowStateRow, "currentStepIndex" | "sessionContext" | "status" | "completedAt">
    >,
  ): Promise<WorkflowStateRow> {
    for (const session of sessions.values()) {
      const state = session.workflowStates.find((w) => w.id === id);
      if (state) {
        Object.assign(state, patch, { updatedAt: new Date() });
        return state;
      }
    }
    throw new Error(`Workflow state ${id} not found`);
  }

  async addStepSubmission(
    workflowStateId: string,
    input: Omit<StepSubmissionRow, "id" | "submittedAt">,
  ): Promise<StepSubmissionRow> {
    for (const session of sessions.values()) {
      const state = session.workflowStates.find((w) => w.id === workflowStateId);
      if (state) {
        const submission: StepSubmissionRow = {
          id: randomUUID(),
          submittedAt: new Date(),
          ...input,
        };
        state.stepSubmissions.push(submission);
        return submission;
      }
    }
    throw new Error(`Workflow state ${workflowStateId} not found`);
  }
}
