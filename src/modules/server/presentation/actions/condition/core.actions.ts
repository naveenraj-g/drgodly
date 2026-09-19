/**
 * Condition core server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Condition (FHIR R5) — all operations
 *
 * All actions use authenticatedProcedure — Condition records are managed by
 * authenticated telemedicine users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import {
  CreateConditionActionSchema,
  ListConditionsActionSchema,
  GetConditionByIdActionSchema,
  UpdateConditionActionSchema,
  DeleteConditionActionSchema,
  type TCreateConditionAction,
  type TListConditionsAction,
  type TGetConditionByIdAction,
  type TUpdateConditionAction,
  type TDeleteConditionAction,
} from "@/modules/entities/schemas/condition";
import {
  createConditionController,
  listConditionsController,
  getConditionByIdController,
  updateConditionController,
  deleteConditionController,
  type TCreateConditionControllerOutput,
  type TListConditionsControllerOutput,
  type TGetConditionByIdControllerOutput,
  type TUpdateConditionControllerOutput,
} from "@/modules/server/core/condition/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a Condition (all fields optional per FHIR spec). */
export const createConditionAction = authenticatedProcedure
  .createServerAction()
  .input(CreateConditionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateConditionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateConditionControllerOutput>(async () => {
        // Merge session org_id into the payload — prevents client from supplying a different org_id
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await createConditionController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Lists Conditions with optional filters (clinical_status, patient_id, recorded_from/to, etc.). */
export const listConditionsAction = authenticatedProcedure
  .createServerAction()
  .input(ListConditionsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListConditionsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListConditionsControllerOutput>(async () => {
        // Merge session org_id into the payload — prevents client from supplying a different org_id
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await listConditionsController(enrichedPayload);
        return { result: data };
      });
    },
  );

/** Fetches a single Condition by numeric ID. */
export const getConditionByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetConditionByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetConditionByIdAction }) => {
    return await runWithTransport<TGetConditionByIdControllerOutput>(async () => {
      const data = await getConditionByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches scalar fields on a Condition (clinical_status, verification_status, severity, onset, etc.). */
export const updateConditionAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateConditionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateConditionAction }) => {
    return await runWithTransport<TUpdateConditionControllerOutput>(async () => {
      const data = await updateConditionController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a Condition and all child records (cascade). */
export const deleteConditionAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteConditionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteConditionAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteConditionController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
