/**
 * EMR Chat entity schemas.
 *
 * Layer: entities / schemas
 * Resource: emr-chat (EmrChatSession, EmrChatMessage, EmrWorkflowState, EmrWorkflowStepSubmission)
 *
 * Single source of truth for all Zod schemas and TypeScript types related to
 * the EMR chat session persistence layer. These types are shared between the
 * server module (Prisma service) and the client (queries, server actions).
 */

import { z } from "zod/v4";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const EmrChatSessionStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type TEmrChatSessionStatus = z.infer<typeof EmrChatSessionStatusSchema>;

export const EmrMessageRoleSchema = z.enum(["USER", "ASSISTANT", "SYSTEM"]);
export type TEmrMessageRole = z.infer<typeof EmrMessageRoleSchema>;

export const EmrMessageTypeSchema = z.enum([
  "TEXT",
  "WORKFLOW_START",
  "WORKFLOW_STEP",
  "WORKFLOW_COMPLETE",
  "WORKFLOW_ABANDONED",
  "WORKFLOW_ERROR",
]);
export type TEmrMessageType = z.infer<typeof EmrMessageTypeSchema>;

export const EmrWorkflowStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
  "ERROR",
]);
export type TEmrWorkflowStatus = z.infer<typeof EmrWorkflowStatusSchema>;

// ── Response Schemas ───────────────────────────────────────────────────────────

/** A single step submission record. */
export const EmrWorkflowStepSubmissionSchema = z.object({
  id: z.string(),
  workflowStateId: z.string(),
  stepIndex: z.number(),
  stepId: z.string(),
  stepName: z.string(),
  actionName: z.string(),
  formData: z.record(z.string(), z.unknown()),
  responseData: z.record(z.string(), z.unknown()).nullish(),
  extractedOutputs: z.record(z.string(), z.unknown()).nullish(),
  submittedAt: z.coerce.date(),
});
export type TEmrWorkflowStepSubmission = z.infer<typeof EmrWorkflowStepSubmissionSchema>;

/** Full workflow run state — includes step submissions for replay. */
export const EmrWorkflowStateSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  triggerMessageId: z.string().nullish(),
  workflowDefinition: z.record(z.string(), z.unknown()),
  workflowId: z.string(),
  workflowName: z.string(),
  currentStepIndex: z.number(),
  totalSteps: z.number(),
  sessionContext: z.record(z.string(), z.unknown()),
  status: EmrWorkflowStatusSchema,
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullish(),
  updatedAt: z.coerce.date(),
  stepSubmissions: z.array(EmrWorkflowStepSubmissionSchema).optional(),
});
export type TEmrWorkflowState = z.infer<typeof EmrWorkflowStateSchema>;

/** A single chat message. */
export const EmrChatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: EmrMessageRoleSchema,
  content: z.string(),
  type: EmrMessageTypeSchema,
  metadata: z.record(z.string(), z.unknown()).nullish(),
  createdAt: z.coerce.date(),
});
export type TEmrChatMessage = z.infer<typeof EmrChatMessageSchema>;

/** Summary row shown in the session sidebar list. */
export const EmrChatSessionSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  status: EmrChatSessionStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  messageCount: z.number(),
  hasActiveWorkflow: z.boolean(),
});
export type TEmrChatSessionSummary = z.infer<typeof EmrChatSessionSummarySchema>;

/** Full session with messages and active workflow state. */
export const EmrChatSessionFullSchema = z.object({
  id: z.string(),
  userId: z.string(),
  orgId: z.string().nullish(),
  title: z.string().nullish(),
  status: EmrChatSessionStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  messages: z.array(EmrChatMessageSchema),
  activeWorkflow: EmrWorkflowStateSchema.nullish(),
});
export type TEmrChatSessionFull = z.infer<typeof EmrChatSessionFullSchema>;

// ── Input Validation Schemas ───────────────────────────────────────────────────

/** Create a new chat session. */
export const CreateEmrChatSessionSchema = z.object({
  userId: z.string().min(1),
  orgId: z.string().optional(),
  title: z.string().optional(),
});
export type TCreateEmrChatSession = z.infer<typeof CreateEmrChatSessionSchema>;

/** Add a message to a session. */
export const AddEmrChatMessageSchema = z.object({
  sessionId: z.string().min(1),
  role: EmrMessageRoleSchema,
  content: z.string(),
  type: EmrMessageTypeSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type TAddEmrChatMessage = z.infer<typeof AddEmrChatMessageSchema>;

/** Create a workflow state row when a workflow starts. */
export const CreateWorkflowStateSchema = z.object({
  sessionId: z.string().min(1),
  triggerMessageId: z.string().optional(),
  workflowDefinition: z.record(z.string(), z.unknown()),
  workflowId: z.string().min(1),
  workflowName: z.string().min(1),
  totalSteps: z.number().int().min(1),
  sessionContext: z.record(z.string(), z.unknown()).optional(),
});
export type TCreateWorkflowState = z.infer<typeof CreateWorkflowStateSchema>;

/** Advance the workflow to the next step and persist accumulated context. */
export const UpdateWorkflowStateSchema = z.object({
  currentStepIndex: z.number().int().min(0).optional(),
  sessionContext: z.record(z.string(), z.unknown()).optional(),
  status: EmrWorkflowStatusSchema.optional(),
});
export type TUpdateWorkflowState = z.infer<typeof UpdateWorkflowStateSchema>;

/** Record a completed step submission. */
export const AddStepSubmissionSchema = z.object({
  workflowStateId: z.string().min(1),
  stepIndex: z.number().int().min(0),
  stepId: z.string().min(1),
  stepName: z.string().min(1),
  actionName: z.string().min(1),
  formData: z.record(z.string(), z.unknown()),
  responseData: z.record(z.string(), z.unknown()).optional(),
  extractedOutputs: z.record(z.string(), z.unknown()).optional(),
});
export type TAddStepSubmission = z.infer<typeof AddStepSubmissionSchema>;

/** Query params for listing sessions. */
export const ListEmrChatSessionsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type TListEmrChatSessions = z.infer<typeof ListEmrChatSessionsSchema>;

// ── Action Schemas (ZSA transport layer) ──────────────────────────────────────

export const CreateEmrChatSessionActionSchema = z.object({
  payload: CreateEmrChatSessionSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateEmrChatSessionAction = z.infer<typeof CreateEmrChatSessionActionSchema>;

export const AddEmrChatMessageActionSchema = z.object({
  payload: AddEmrChatMessageSchema,
});
export type TAddEmrChatMessageAction = z.infer<typeof AddEmrChatMessageActionSchema>;

export const CreateWorkflowStateActionSchema = z.object({
  payload: CreateWorkflowStateSchema,
});
export type TCreateWorkflowStateAction = z.infer<typeof CreateWorkflowStateActionSchema>;

export const UpdateWorkflowStateActionSchema = z.object({
  id: z.string().min(1),
  payload: UpdateWorkflowStateSchema,
});
export type TUpdateWorkflowStateAction = z.infer<typeof UpdateWorkflowStateActionSchema>;

export const AddStepSubmissionActionSchema = z.object({
  payload: AddStepSubmissionSchema,
});
export type TAddStepSubmissionAction = z.infer<typeof AddStepSubmissionActionSchema>;

export const GetEmrChatSessionActionSchema = z.object({
  id: z.string().min(1),
});
export type TGetEmrChatSessionAction = z.infer<typeof GetEmrChatSessionActionSchema>;

export const ListEmrChatSessionsActionSchema = z.object({
  payload: ListEmrChatSessionsSchema,
});
export type TListEmrChatSessionsAction = z.infer<typeof ListEmrChatSessionsActionSchema>;

export const DeleteEmrChatSessionActionSchema = z.object({
  id: z.string().min(1),
});
export type TDeleteEmrChatSessionAction = z.infer<typeof DeleteEmrChatSessionActionSchema>;
