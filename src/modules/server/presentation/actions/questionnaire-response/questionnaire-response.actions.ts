/**
 * QuestionnaireResponse server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: QuestionnaireResponse (FHIR R4)
 */

"use server";

import {
  CreateQuestionnaireResponseActionSchema,
  ListQuestionnaireResponsesActionSchema,
  GetQuestionnaireResponseByIdActionSchema,
  UpdateQuestionnaireResponseActionSchema,
  DeleteQuestionnaireResponseActionSchema,
  type TCreateQuestionnaireResponseAction,
  type TListQuestionnaireResponsesAction,
  type TGetQuestionnaireResponseByIdAction,
  type TUpdateQuestionnaireResponseAction,
  type TDeleteQuestionnaireResponseAction,
} from "@/modules/entities/schemas/questionnaire-response";
import {
  createQuestionnaireResponseController,
  listQuestionnaireResponsesController,
  getQuestionnaireResponseByIdController,
  updateQuestionnaireResponseController,
  deleteQuestionnaireResponseController,
  type TCreateQuestionnaireResponseControllerOutput,
  type TListQuestionnaireResponsesControllerOutput,
  type TGetQuestionnaireResponseByIdControllerOutput,
  type TUpdateQuestionnaireResponseControllerOutput,
} from "@/modules/server/core/questionnaire-response/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a QuestionnaireResponse. */
export const createQuestionnaireResponseAction = authenticatedProcedure
  .createServerAction()
  .input(CreateQuestionnaireResponseActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateQuestionnaireResponseAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateQuestionnaireResponseControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data =
            await createQuestionnaireResponseController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Lists QuestionnaireResponses with optional filters. */
export const listQuestionnaireResponsesAction = authenticatedProcedure
  .createServerAction()
  .input(ListQuestionnaireResponsesActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListQuestionnaireResponsesAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListQuestionnaireResponsesControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data =
            await listQuestionnaireResponsesController(enrichedPayload);
          return { result: data };
        },
      );
    },
  );

/** Fetches a single QuestionnaireResponse by numeric ID. */
export const getQuestionnaireResponseByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetQuestionnaireResponseByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetQuestionnaireResponseByIdAction }) => {
    return await runWithTransport<TGetQuestionnaireResponseByIdControllerOutput>(
      async () => {
        const data = await getQuestionnaireResponseByIdController(
          input.payload,
        );
        return { result: data };
      },
    );
  });

/** Partially updates a QuestionnaireResponse by ID. */
export const updateQuestionnaireResponseAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateQuestionnaireResponseActionSchema, { skipInputParsing: true })
  .handler(
    async ({ input }: { input: TUpdateQuestionnaireResponseAction }) => {
      return await runWithTransport<TUpdateQuestionnaireResponseControllerOutput>(
        async () => {
          const data = await updateQuestionnaireResponseController(
            input.payload,
          );
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Permanently deletes a QuestionnaireResponse by ID. */
export const deleteQuestionnaireResponseAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteQuestionnaireResponseActionSchema, { skipInputParsing: true })
  .handler(
    async ({ input }: { input: TDeleteQuestionnaireResponseAction }) => {
      return await runWithTransport<void>(async () => {
        await deleteQuestionnaireResponseController(input.payload);
        return { result: undefined, transport: input.transportOptions };
      });
    },
  );
