/**
 * Questionnaire server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Questionnaire (FHIR R4)
 */

"use server";

import {
  CreateQuestionnaireActionSchema,
  ListQuestionnairesActionSchema,
  GetQuestionnaireByIdActionSchema,
  UpdateQuestionnaireActionSchema,
  DeleteQuestionnaireActionSchema,
  type TCreateQuestionnaireAction,
  type TListQuestionnairesAction,
  type TGetQuestionnaireByIdAction,
  type TUpdateQuestionnaireAction,
  type TDeleteQuestionnaireAction,
} from "@/modules/entities/schemas/questionnaire";
import {
  createQuestionnaireController,
  listQuestionnairesController,
  getQuestionnaireByIdController,
  updateQuestionnaireController,
  deleteQuestionnaireController,
  type TCreateQuestionnaireControllerOutput,
  type TListQuestionnairesControllerOutput,
  type TGetQuestionnaireByIdControllerOutput,
  type TUpdateQuestionnaireControllerOutput,
  type TDeleteQuestionnaireControllerOutput,
} from "@/modules/server/core/questionnaire/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a Questionnaire. */
export const createQuestionnaireAction = authenticatedProcedure
  .createServerAction()
  .input(CreateQuestionnaireActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateQuestionnaireAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateQuestionnaireControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await createQuestionnaireController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Lists Questionnaires with optional filters. */
export const listQuestionnairesAction = authenticatedProcedure
  .createServerAction()
  .input(ListQuestionnairesActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListQuestionnairesAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListQuestionnairesControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listQuestionnairesController(enrichedPayload);
          return { result: data };
        },
      );
    },
  );

/** Fetches a single Questionnaire by numeric ID. */
export const getQuestionnaireByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetQuestionnaireByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetQuestionnaireByIdAction }) => {
    return await runWithTransport<TGetQuestionnaireByIdControllerOutput>(
      async () => {
        const data = await getQuestionnaireByIdController(input.payload);
        return { result: data };
      },
    );
  });

/** Patches a Questionnaire by ID. */
export const updateQuestionnaireAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateQuestionnaireActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TUpdateQuestionnaireAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TUpdateQuestionnaireControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await updateQuestionnaireController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Permanently deletes a Questionnaire. */
export const deleteQuestionnaireAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteQuestionnaireActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteQuestionnaireAction }) => {
    return await runWithTransport<TDeleteQuestionnaireControllerOutput>(
      async () => {
        const data = await deleteQuestionnaireController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });
