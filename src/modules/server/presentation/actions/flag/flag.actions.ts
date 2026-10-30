/**
 * Flag server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Flag (FHIR R4)
 */

"use server";

import {
  CreateFlagActionSchema,
  ListFlagsActionSchema,
  GetFlagByIdActionSchema,
  UpdateFlagActionSchema,
  DeleteFlagActionSchema,
  type TCreateFlagAction,
  type TListFlagsAction,
  type TGetFlagByIdAction,
  type TUpdateFlagAction,
  type TDeleteFlagAction,
} from "@/modules/entities/schemas/flag";
import {
  createFlagController,
  listFlagsController,
  getFlagByIdController,
  updateFlagController,
  deleteFlagController,
  type TCreateFlagControllerOutput,
  type TListFlagsControllerOutput,
  type TGetFlagByIdControllerOutput,
  type TUpdateFlagControllerOutput,
} from "@/modules/server/core/flag/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a Flag. */
export const createFlagAction = authenticatedProcedure
  .createServerAction()
  .input(CreateFlagActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateFlagAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateFlagControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await createFlagController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Lists Flags with optional filters. */
export const listFlagsAction = authenticatedProcedure
  .createServerAction()
  .input(ListFlagsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListFlagsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListFlagsControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await listFlagsController(enrichedPayload);
        return { result: data };
      });
    },
  );

/** Fetches a single Flag by numeric ID. */
export const getFlagByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetFlagByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetFlagByIdAction }) => {
    return await runWithTransport<TGetFlagByIdControllerOutput>(async () => {
      const data = await getFlagByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches a Flag by ID. */
export const updateFlagAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateFlagActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateFlagAction }) => {
    return await runWithTransport<TUpdateFlagControllerOutput>(async () => {
      const data = await updateFlagController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Deletes a Flag by numeric ID. */
export const deleteFlagAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteFlagActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteFlagAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteFlagController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
