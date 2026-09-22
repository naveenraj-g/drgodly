/**
 * a2ui/session-store — swappable persistence interface for chat sessions.
 *
 * Layer: server / a2ui
 *
 * The chat container needs somewhere to keep session history (the sidebar,
 * "resume a past chart review"), the running message log, and in-progress
 * workflow state (which step you're on, what's been submitted so far). This
 * file defines that contract as a plain interface so a project with no
 * database can run the engine unchanged (see memory-session-store.ts, the
 * default — resets on server restart, which is fine for local dev/demos),
 * while a project with one swaps in a real implementation without touching
 * any client component or hook — they all go through session-actions.ts,
 * which only knows about this interface.
 *
 * See ../../references/persistence-prisma-example.md for a complete Prisma
 * schema + implementation to copy from if you want durable history.
 */

/** One workflow run's summary, as shown in the session list's expandable history. */
export interface SessionWorkflowSummary {
  id: string;
  workflowName: string;
  status: WorkflowRunStatus;
}

export interface SessionRow {
  id: string;
  userId: string;
  orgId?: string | null;
  title: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Denormalized for the sidebar list — avoids a second query per row. */
  messageCount: number;
  hasActiveWorkflow: boolean;
  workflows: SessionWorkflowSummary[];
}

export interface MessageRow {
  id: string;
  sessionId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  type: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type WorkflowRunStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "ERROR";

export interface StepSubmissionRow {
  id: string;
  stepIndex: number;
  stepId: string;
  stepName: string;
  actionName?: string;
  formData?: unknown;
  responseData?: unknown;
  extractedOutputs?: unknown;
  submittedAt: Date;
}

export interface WorkflowStateRow {
  id: string;
  sessionId: string;
  workflowId: string;
  workflowName: string;
  /** The full WorkflowDefinition this run started from — replayed on session reload. */
  workflowDefinition: unknown;
  sessionContext: Record<string, unknown>;
  currentStepIndex: number;
  status: WorkflowRunStatus;
  stepSubmissions: StepSubmissionRow[];
  completedAt?: Date | null;
  updatedAt: Date;
}

export interface SessionWithDetail {
  session: SessionRow;
  messages: MessageRow[];
  activeWorkflow: WorkflowStateRow | null;
  completedWorkflows: WorkflowStateRow[];
}

export interface SessionStore {
  listSessions(userId: string, limit: number): Promise<SessionRow[]>;
  createSession(input: { userId: string; orgId?: string; title?: string }): Promise<SessionRow>;
  /** Scoped to userId so a forged sessionId can never load another user's session. */
  getSessionDetail(id: string, userId: string): Promise<SessionWithDetail | null>;
  deleteSession(id: string): Promise<void>;
  renameSession(id: string, title: string): Promise<void>;
  pinSession(id: string, pinned: boolean): Promise<void>;

  addMessage(
    sessionId: string,
    message: Omit<MessageRow, "id" | "sessionId" | "createdAt">,
  ): Promise<MessageRow>;

  createWorkflowState(input: {
    sessionId: string;
    workflowId: string;
    workflowName: string;
    workflowDefinition: unknown;
    sessionContext: Record<string, unknown>;
    /** Informational only — the real step count is derivable from workflowDefinition. */
    totalSteps?: number;
  }): Promise<WorkflowStateRow>;

  updateWorkflowState(
    id: string,
    patch: Partial<
      Pick<
        WorkflowStateRow,
        "currentStepIndex" | "sessionContext" | "status" | "completedAt"
      >
    >,
  ): Promise<WorkflowStateRow>;

  addStepSubmission(
    workflowStateId: string,
    input: Omit<StepSubmissionRow, "id" | "submittedAt">,
  ): Promise<StepSubmissionRow>;
}
