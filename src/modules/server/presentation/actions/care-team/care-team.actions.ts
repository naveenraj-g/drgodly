/**
 * CareTeam server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: CareTeam (FHIR R4)
 */

"use server";

import {
  CreateCareTeamActionSchema,
  ListCareTeamsActionSchema,
  GetCareTeamByIdActionSchema,
  UpdateCareTeamActionSchema,
  DeleteCareTeamActionSchema,
  type TCreateCareTeamAction,
  type TListCareTeamsAction,
  type TGetCareTeamByIdAction,
  type TUpdateCareTeamAction,
  type TDeleteCareTeamAction,
} from "@/modules/entities/schemas/care-team";
import {
  createCareTeamController,
  listCareTeamsController,
  getCareTeamByIdController,
  updateCareTeamController,
  deleteCareTeamController,
  type TCreateCareTeamControllerOutput,
  type TListCareTeamsControllerOutput,
  type TGetCareTeamByIdControllerOutput,
  type TUpdateCareTeamControllerOutput,
} from "@/modules/server/core/care-team/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a CareTeam. */
export const createCareTeamAction = authenticatedProcedure
  .createServerAction()
  .input(CreateCareTeamActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateCareTeamAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateCareTeamControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await createCareTeamController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Lists CareTeams with optional filters. */
export const listCareTeamsAction = authenticatedProcedure
  .createServerAction()
  .input(ListCareTeamsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListCareTeamsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListCareTeamsControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listCareTeamsController(enrichedPayload);
          return { result: data };
        },
      );
    },
  );

/** Fetches a single CareTeam by numeric ID. */
export const getCareTeamByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetCareTeamByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetCareTeamByIdAction }) => {
    return await runWithTransport<TGetCareTeamByIdControllerOutput>(
      async () => {
        const data = await getCareTeamByIdController(input.payload);
        return { result: data };
      },
    );
  });

/** Patches a CareTeam by ID. */
export const updateCareTeamAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateCareTeamActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateCareTeamAction }) => {
    return await runWithTransport<TUpdateCareTeamControllerOutput>(
      async () => {
        const data = await updateCareTeamController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Deletes a CareTeam by numeric ID. */
export const deleteCareTeamAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteCareTeamActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteCareTeamAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteCareTeamController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
