/**
 * EMR Chat controllers barrel.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Each controller validates raw input against the entity Zod schema, delegates
 * to the appropriate use case, and runs the output through a presenter function.
 * Throws InputParseError on validation failure so ZSA converts it to a typed
 * client error.
 */

import {
  CreateEmrChatSessionSchema,
  AddEmrChatMessageSchema,
  CreateWorkflowStateSchema,
  UpdateWorkflowStateSchema,
  AddStepSubmissionSchema,
  ListEmrChatSessionsSchema,
  type TEmrChatSessionSummary,
  type TEmrChatSessionFull,
  type TEmrChatMessage,
  type TEmrWorkflowState,
  type TEmrWorkflowStepSubmission,
} from "@/modules/entities/schemas/emr-chat/emr-chat.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createSessionUseCase } from "../../application/usecases/createSession.usecase";
import { getSessionUseCase } from "../../application/usecases/getSession.usecase";
import { listSessionsUseCase } from "../../application/usecases/listSessions.usecase";
import { deleteSessionUseCase } from "../../application/usecases/deleteSession.usecase";
import { addMessageUseCase } from "../../application/usecases/addMessage.usecase";
import { createWorkflowStateUseCase } from "../../application/usecases/createWorkflowState.usecase";
import { updateWorkflowStateUseCase } from "../../application/usecases/updateWorkflowState.usecase";
import { addStepSubmissionUseCase } from "../../application/usecases/addStepSubmission.usecase";

// ── Presenter functions (identity — types shape the contract) ─────────────────

function presentSession(data: TEmrChatSessionSummary) {
  return data;
}
function presentSessionFull(data: TEmrChatSessionFull) {
  return data;
}
function presentSessions(data: TEmrChatSessionSummary[]) {
  return data;
}
function presentMessage(data: TEmrChatMessage) {
  return data;
}
function presentWorkflowState(data: TEmrWorkflowState) {
  return data;
}
function presentStepSubmission(data: TEmrWorkflowStepSubmission) {
  return data;
}

// ── Output types ──────────────────────────────────────────────────────────────

export type TCreateSessionControllerOutput = ReturnType<typeof presentSession>;
export type TGetSessionControllerOutput = ReturnType<typeof presentSessionFull>;
export type TListSessionsControllerOutput = ReturnType<typeof presentSessions>;
export type TAddMessageControllerOutput = ReturnType<typeof presentMessage>;
export type TCreateWorkflowStateControllerOutput = ReturnType<typeof presentWorkflowState>;
export type TUpdateWorkflowStateControllerOutput = ReturnType<typeof presentWorkflowState>;
export type TAddStepSubmissionControllerOutput = ReturnType<typeof presentStepSubmission>;

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * Validates input and creates a new chat session.
 *
 * @param input - Raw create session payload.
 * @returns Created session summary.
 * @throws InputParseError on validation failure.
 */
export async function createSessionController(
  input: unknown,
): Promise<TCreateSessionControllerOutput> {
  const parsed = await CreateEmrChatSessionSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createSessionUseCase(parsed.data);
  return presentSession(data);
}

/**
 * Loads a full session by ID.
 *
 * @param id - Session UUID.
 * @returns Full session with messages and active workflow.
 * @throws NotFoundError if not found.
 */
export async function getSessionController(
  id: string,
): Promise<TGetSessionControllerOutput> {
  const data = await getSessionUseCase(id);
  return presentSessionFull(data);
}

/**
 * Lists sessions for the authenticated user.
 *
 * @param input - Raw list query params.
 * @returns Array of session summaries.
 * @throws InputParseError on validation failure.
 */
export async function listSessionsController(
  input: unknown,
): Promise<TListSessionsControllerOutput> {
  const parsed = await ListEmrChatSessionsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listSessionsUseCase(parsed.data);
  return presentSessions(data);
}

/**
 * Archives a session so it no longer appears in the sidebar.
 *
 * @param id - Session UUID.
 */
export async function deleteSessionController(id: string): Promise<void> {
  await deleteSessionUseCase(id);
}

/**
 * Appends a message to a session.
 *
 * @param input - Raw add message payload.
 * @returns Created message.
 * @throws InputParseError on validation failure.
 */
export async function addMessageController(
  input: unknown,
): Promise<TAddMessageControllerOutput> {
  const parsed = await AddEmrChatMessageSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await addMessageUseCase(parsed.data);
  return presentMessage(data);
}

/**
 * Creates a workflow state row when a FHIR workflow begins.
 *
 * @param input - Raw create workflow state payload.
 * @returns Created workflow state.
 * @throws InputParseError on validation failure.
 */
export async function createWorkflowStateController(
  input: unknown,
): Promise<TCreateWorkflowStateControllerOutput> {
  const parsed = await CreateWorkflowStateSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createWorkflowStateUseCase(parsed.data);
  return presentWorkflowState(data);
}

/**
 * Advances the workflow step or updates session context.
 *
 * @param id - WorkflowState UUID.
 * @param input - Raw update payload.
 * @returns Updated workflow state.
 * @throws InputParseError on validation failure.
 */
export async function updateWorkflowStateController(
  id: string,
  input: unknown,
): Promise<TUpdateWorkflowStateControllerOutput> {
  const parsed = await UpdateWorkflowStateSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateWorkflowStateUseCase(id, parsed.data);
  return presentWorkflowState(data);
}

/**
 * Records a completed step submission.
 *
 * @param input - Raw add step submission payload.
 * @returns Created or updated step submission.
 * @throws InputParseError on validation failure.
 */
export async function addStepSubmissionController(
  input: unknown,
): Promise<TAddStepSubmissionControllerOutput> {
  const parsed = await AddStepSubmissionSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await addStepSubmissionUseCase(parsed.data);
  return presentStepSubmission(data);
}
