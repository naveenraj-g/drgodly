/**
 * PlanDefinition server actions — create, list, getById, update, delete, apply.
 *
 * Layer: presentation / actions
 * Resource: PlanDefinition (FHIR R4)
 *
 * Actions use authenticatedProcedure — PlanDefinition records are managed by
 * authenticated telemedicine users and bound to the active organization.
 */

"use server";

import {
  CreatePlanDefinitionActionSchema,
  ListPlanDefinitionsActionSchema,
  GetPlanDefinitionByIdActionSchema,
  UpdatePlanDefinitionActionSchema,
  DeletePlanDefinitionActionSchema,
  ApplyPlanDefinitionActionSchema,
  type TCreatePlanDefinitionAction,
  type TListPlanDefinitionsAction,
  type TGetPlanDefinitionByIdAction,
  type TUpdatePlanDefinitionAction,
  type TDeletePlanDefinitionAction,
  type TApplyPlanDefinitionAction,
} from "@/modules/entities/schemas/plan-definition";
import {
  createPlanDefinitionController,
  listPlanDefinitionsController,
  getPlanDefinitionByIdController,
  updatePlanDefinitionController,
  deletePlanDefinitionController,
  applyPlanDefinitionController,
  type TCreatePlanDefinitionControllerOutput,
  type TListPlanDefinitionsControllerOutput,
  type TGetPlanDefinitionByIdControllerOutput,
  type TUpdatePlanDefinitionControllerOutput,
  type TDeletePlanDefinitionControllerOutput,
  type TApplyPlanDefinitionControllerOutput,
} from "@/modules/server/core/plan-definition/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a PlanDefinition. */
export const createPlanDefinitionAction = authenticatedProcedure
  .createServerAction()
  .input(CreatePlanDefinitionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreatePlanDefinitionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreatePlanDefinitionControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await createPlanDefinitionController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Lists PlanDefinitions with optional filters scoped to caller's org_id. */
export const listPlanDefinitionsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPlanDefinitionsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListPlanDefinitionsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListPlanDefinitionsControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await listPlanDefinitionsController(enrichedPayload);
        return { result: data };
      });
    },
  );

/** Fetches a single PlanDefinition by numeric ID. */
export const getPlanDefinitionByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetPlanDefinitionByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetPlanDefinitionByIdAction }) => {
    return await runWithTransport<TGetPlanDefinitionByIdControllerOutput>(async () => {
      const data = await getPlanDefinitionByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches a PlanDefinition by ID. */
export const updatePlanDefinitionAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePlanDefinitionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TUpdatePlanDefinitionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TUpdatePlanDefinitionControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await updatePlanDefinitionController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Permanently deletes a PlanDefinition. */
export const deletePlanDefinitionAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePlanDefinitionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePlanDefinitionAction }) => {
    return await runWithTransport<TDeletePlanDefinitionControllerOutput>(async () => {
      const data = await deletePlanDefinitionController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/**
 * Applies a PlanDefinition to a subject (FHIR `$apply`). `persist=false` previews only.
 * org_id is always taken from the session, never from the client payload.
 */
export const applyPlanDefinitionAction = authenticatedProcedure
  .createServerAction()
  .input(ApplyPlanDefinitionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TApplyPlanDefinitionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TApplyPlanDefinitionControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await applyPlanDefinitionController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );
