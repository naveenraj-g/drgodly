/**
 * Procedure server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Procedure (FHIR R4) — all operations
 *
 * All actions use authenticatedProcedure — Procedure records are managed by
 * authenticated telemedicine users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import {
  CreateProcedureActionSchema,
  ListProceduresActionSchema,
  GetProcedureByIdActionSchema,
  UpdateProcedureActionSchema,
  DeleteProcedureActionSchema,
  type TCreateProcedureAction,
  type TListProceduresAction,
  type TGetProcedureByIdAction,
  type TUpdateProcedureAction,
  type TDeleteProcedureAction,
} from "@/modules/entities/schemas/procedure";
import {
  createProcedureController,
  listProceduresController,
  getByIdProcedureController,
  updateProcedureController,
  deleteProcedureController,
  type TCreateProcedureControllerOutput,
  type TListProceduresControllerOutput,
  type TGetByIdProcedureControllerOutput,
  type TUpdateProcedureControllerOutput,
} from "@/modules/server/core/procedure/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a Procedure (`status` and `subject` required, everything else optional). */
export const createProcedureAction = authenticatedProcedure
  .createServerAction()
  .input(CreateProcedureActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateProcedureAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateProcedureControllerOutput>(async () => {
        // Merge session org_id into the payload — prevents client from supplying a different org_id
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await createProcedureController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Lists Procedures with optional filters (status, code, patient, encounter, performer, etc.). */
export const listProceduresAction = authenticatedProcedure
  .createServerAction()
  .input(ListProceduresActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListProceduresAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListProceduresControllerOutput>(async () => {
        // Merge session org_id into the payload — prevents client from supplying a different org_id
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await listProceduresController(enrichedPayload);
        return { result: data };
      });
    },
  );

/** Fetches a single Procedure by numeric ID. */
export const getProcedureByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetProcedureByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetProcedureByIdAction }) => {
    return await runWithTransport<TGetByIdProcedureControllerOutput>(async () => {
      const data = await getByIdProcedureController(input.payload);
      return { result: data };
    });
  });

/** Patches scalar/reference fields and child arrays (REPLACE semantics) on a Procedure. */
export const updateProcedureAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateProcedureActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateProcedureAction }) => {
    return await runWithTransport<TUpdateProcedureControllerOutput>(async () => {
      const data = await updateProcedureController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a Procedure and all child records (cascade). */
export const deleteProcedureAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteProcedureActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteProcedureAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteProcedureController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
