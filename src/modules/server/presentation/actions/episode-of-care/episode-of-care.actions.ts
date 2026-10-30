/**
 * EpisodeOfCare server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: EpisodeOfCare (FHIR R4)
 */

"use server";

import {
  CreateEpisodeOfCareActionSchema,
  ListEpisodeOfCaresActionSchema,
  GetEpisodeOfCareByIdActionSchema,
  UpdateEpisodeOfCareActionSchema,
  DeleteEpisodeOfCareActionSchema,
  type TCreateEpisodeOfCareAction,
  type TListEpisodeOfCaresAction,
  type TGetEpisodeOfCareByIdAction,
  type TUpdateEpisodeOfCareAction,
  type TDeleteEpisodeOfCareAction,
} from "@/modules/entities/schemas/episode-of-care";
import {
  createEpisodeOfCareController,
  listEpisodeOfCaresController,
  getEpisodeOfCareByIdController,
  updateEpisodeOfCareController,
  deleteEpisodeOfCareController,
  type TCreateEpisodeOfCareControllerOutput,
  type TListEpisodeOfCaresControllerOutput,
  type TGetEpisodeOfCareByIdControllerOutput,
  type TUpdateEpisodeOfCareControllerOutput,
} from "@/modules/server/core/episode-of-care/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates an EpisodeOfCare. */
export const createEpisodeOfCareAction = authenticatedProcedure
  .createServerAction()
  .input(CreateEpisodeOfCareActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateEpisodeOfCareAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateEpisodeOfCareControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await createEpisodeOfCareController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Lists EpisodeOfCares with optional filters. */
export const listEpisodeOfCaresAction = authenticatedProcedure
  .createServerAction()
  .input(ListEpisodeOfCaresActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListEpisodeOfCaresAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListEpisodeOfCaresControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listEpisodeOfCaresController(enrichedPayload);
          return { result: data };
        },
      );
    },
  );

/** Fetches a single EpisodeOfCare by numeric ID. */
export const getEpisodeOfCareByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetEpisodeOfCareByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetEpisodeOfCareByIdAction }) => {
    return await runWithTransport<TGetEpisodeOfCareByIdControllerOutput>(
      async () => {
        const data = await getEpisodeOfCareByIdController(input.payload);
        return { result: data };
      },
    );
  });

/** Patches an EpisodeOfCare by ID. */
export const updateEpisodeOfCareAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateEpisodeOfCareActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateEpisodeOfCareAction }) => {
    return await runWithTransport<TUpdateEpisodeOfCareControllerOutput>(
      async () => {
        const data = await updateEpisodeOfCareController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Deletes an EpisodeOfCare by numeric ID. */
export const deleteEpisodeOfCareAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteEpisodeOfCareActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteEpisodeOfCareAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteEpisodeOfCareController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
