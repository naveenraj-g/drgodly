/**
 * EMR Chat server actions.
 *
 * Layer: server / presentation / actions / emr-chat
 *
 * ZSA server actions that the client uses for all EMR chat session persistence.
 * All actions require the user to be authenticated. Session-scoped writes also
 * verify the session belongs to the calling user at the controller level.
 *
 * Actions in this file:
 *   createEmrChatSessionAction   — start a new chat session
 *   listEmrChatSessionsAction    — sidebar session list
 *   getEmrChatSessionAction      — load full session on open
 *   deleteEmrChatSessionAction   — archive a session
 *   renameEmrChatSessionAction   — update session title from sidebar inline edit
 *   pinEmrChatSessionAction      — pin / unpin a session so it floats to the top
 *   addEmrChatMessageAction      — persist a chat message
 *   createWorkflowStateAction    — record a new workflow run
 *   updateWorkflowStateAction    — advance step / update context / mark complete
 *   addStepSubmissionAction      — record a completed step submission
 */

"use server";

import {
  CreateEmrChatSessionActionSchema,
  type TCreateEmrChatSessionAction,
  AddEmrChatMessageActionSchema,
  type TAddEmrChatMessageAction,
  CreateWorkflowStateActionSchema,
  UpdateWorkflowStateActionSchema,
  AddStepSubmissionActionSchema,
  GetEmrChatSessionActionSchema,
  type TGetEmrChatSessionAction,
  ListEmrChatSessionsActionSchema,
  type TListEmrChatSessionsAction,
  DeleteEmrChatSessionActionSchema,
  type TDeleteEmrChatSessionAction,
  RenameEmrChatSessionActionSchema,
  type TRenameEmrChatSessionAction,
  PinEmrChatSessionActionSchema,
  type TPinEmrChatSessionAction,
} from "@/modules/entities/schemas/emr-chat";
import {
  createSessionController,
  getSessionController,
  listSessionsController,
  deleteSessionController,
  renameSessionController,
  pinSessionController,
  addMessageController,
  createWorkflowStateController,
  updateWorkflowStateController,
  addStepSubmissionController,
  type TCreateSessionControllerOutput,
  type TGetSessionControllerOutput,
  type TListSessionsControllerOutput,
  type TAddMessageControllerOutput,
  type TCreateWorkflowStateControllerOutput,
  type TUpdateWorkflowStateControllerOutput,
  type TAddStepSubmissionControllerOutput,
} from "@/modules/server/core/emr-chat/interface-adapters/controllers";
import type { AuthResponse } from "@/modules/server/auth/types";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/**
 * Creates a new EMR chat session for the authenticated user.
 * Called when the user sends their first message in an empty chat.
 * userId and orgId are both injected from the session — the client cannot
 * attribute the session to another user or another tenant.
 */
export const createEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(CreateEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateEmrChatSessionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateSessionControllerOutput>(async () => {
        // Inject userId/orgId from session — client cannot impersonate another
        // user or attribute the session to another org
        const enrichedPayload = {
          ...input.payload,
          userId: ctx.session.session.userId,
          orgId: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await createSessionController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/**
 * Lists the sidebar session history for the authenticated user.
 * Returns summaries ordered by most recently updated. userId is injected
 * from the session — the client cannot list another user's sessions.
 */
export const listEmrChatSessionsAction = authenticatedProcedure
  .createServerAction()
  .input(ListEmrChatSessionsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListEmrChatSessionsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListSessionsControllerOutput>(async () => {
        // Inject userId from session — client cannot list another user's sessions
        const enrichedPayload = {
          ...input.payload,
          userId: ctx.session.session.userId,
        };
        const data = await listSessionsController(enrichedPayload);
        return { result: data };
      });
    },
  );

/**
 * Loads a full session with all messages and the active workflow state.
 * Called when the user clicks a session in the history sidebar. userId is
 * injected from the session — a session UUID belonging to another user is
 * treated as not found rather than trusted from the client.
 */
export const getEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(GetEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TGetEmrChatSessionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TGetSessionControllerOutput>(async () => {
        const data = await getSessionController(
          input.id,
          ctx.session.session.userId,
        );
        return { result: data };
      });
    },
  );

/**
 * Archives a session so it no longer appears in the sidebar.
 * Data is retained for compliance — the session is never physically deleted.
 * userId is injected from the session — the client cannot archive another
 * user's session.
 */
export const deleteEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TDeleteEmrChatSessionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<void>(async () => {
        await deleteSessionController(input.id, ctx.session.session.userId);
        return { result: undefined };
      });
    },
  );

/**
 * Updates the session title from the sidebar inline edit. userId is injected
 * from the session — the client cannot rename another user's session.
 */
export const renameEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(RenameEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TRenameEmrChatSessionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<void>(async () => {
        await renameSessionController(
          input.id,
          ctx.session.session.userId,
          input.title,
        );
        return { result: undefined };
      });
    },
  );

/**
 * Pins or unpins a session so it floats to the top of the sidebar list.
 * userId is injected from the session — the client cannot pin/unpin another
 * user's session.
 */
export const pinEmrChatSessionAction = authenticatedProcedure
  .createServerAction()
  .input(PinEmrChatSessionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TPinEmrChatSessionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<void>(async () => {
        await pinSessionController(
          input.id,
          ctx.session.session.userId,
          input.pinned,
        );
        return { result: undefined };
      });
    },
  );

/**
 * Persists a single chat message (user or assistant) to the active session.
 * Called after every user send and every assistant reply. userId is
 * injected from the session — the client cannot append messages to another
 * user's session.
 */
export const addEmrChatMessageAction = authenticatedProcedure
  .createServerAction()
  .input(AddEmrChatMessageActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TAddEmrChatMessageAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TAddMessageControllerOutput>(async () => {
        const data = await addMessageController(
          input.payload,
          ctx.session.session.userId,
        );
        return { result: data };
      });
    },
  );

/**
 * Creates a workflow state row when a FHIR workflow begins.
 * Stores the full WorkflowDefinition JSON so the session can be resumed
 * even if the workflow definition changes in a later deployment.
 */
export const createWorkflowStateAction = authenticatedProcedure
  .createServerAction()
  .input(CreateWorkflowStateActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateWorkflowStateControllerOutput>(async () => {
      const data = await createWorkflowStateController(input.payload);
      return { result: data };
    });
  });

/**
 * Advances the current step or updates the accumulated FHIR session context.
 * Also used to mark a workflow as COMPLETED or ABANDONED.
 */
export const updateWorkflowStateAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateWorkflowStateActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateWorkflowStateControllerOutput>(async () => {
      const data = await updateWorkflowStateController(input.id, input.payload);
      return { result: data };
    });
  });

/**
 * Records a completed step submission for auditing and session resume.
 * Upserts — re-submitting a step after an error replaces the previous record.
 */
export const addStepSubmissionAction = authenticatedProcedure
  .createServerAction()
  .input(AddStepSubmissionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TAddStepSubmissionControllerOutput>(async () => {
      const data = await addStepSubmissionController(input.payload);
      return { result: data };
    });
  });
