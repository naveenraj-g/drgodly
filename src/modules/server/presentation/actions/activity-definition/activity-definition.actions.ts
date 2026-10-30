/**
 * ActivityDefinition server actions — create, list, getById, update, delete, apply.
 *
 * Layer: presentation / actions
 * Resource: ActivityDefinition (FHIR R4)
 *
 * Actions use authenticatedProcedure — ActivityDefinition records are managed by
 * authenticated telemedicine users and bound to the active organization.
 */

"use server";

import {
  CreateActivityDefinitionActionSchema,
  ListActivityDefinitionsActionSchema,
  GetByIdActivityDefinitionActionSchema,
  UpdateActivityDefinitionActionSchema,
  DeleteActivityDefinitionActionSchema,
  ApplyActivityDefinitionActionSchema,
  type TCreateActivityDefinitionAction,
  type TListActivityDefinitionsAction,
  type TGetByIdActivityDefinitionAction,
  type TUpdateActivityDefinitionAction,
  type TDeleteActivityDefinitionAction,
  type TApplyActivityDefinitionAction,
} from "@/modules/entities/schemas/activity-definition";
import {
  createActivityDefinitionController,
  listActivityDefinitionsController,
  getActivityDefinitionByIdController,
  updateActivityDefinitionController,
  deleteActivityDefinitionController,
  applyActivityDefinitionController,
  type TCreateActivityDefinitionControllerOutput,
  type TListActivityDefinitionsControllerOutput,
  type TGetByIdActivityDefinitionControllerOutput,
  type TUpdateActivityDefinitionControllerOutput,
  type TDeleteActivityDefinitionControllerOutput,
  type TApplyActivityDefinitionControllerOutput,
} from "@/modules/server/core/activity-definition/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates an ActivityDefinition. */
export const createActivityDefinitionAction = authenticatedProcedure
  .createServerAction()
  .input(CreateActivityDefinitionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateActivityDefinitionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateActivityDefinitionControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data =
            await createActivityDefinitionController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Lists ActivityDefinitions with optional filters scoped to caller's org_id. */
export const listActivityDefinitionsAction = authenticatedProcedure
  .createServerAction()
  .input(ListActivityDefinitionsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListActivityDefinitionsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListActivityDefinitionsControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listActivityDefinitionsController(enrichedPayload);
          return { result: data };
        },
      );
    },
  );

/** Fetches a single ActivityDefinition by numeric ID. */
export const getActivityDefinitionByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetByIdActivityDefinitionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetByIdActivityDefinitionAction }) => {
    return await runWithTransport<TGetByIdActivityDefinitionControllerOutput>(
      async () => {
        const data = await getActivityDefinitionByIdController(input.payload);
        return { result: data };
      },
    );
  });

/** Patches an ActivityDefinition by ID. */
export const updateActivityDefinitionAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateActivityDefinitionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TUpdateActivityDefinitionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TUpdateActivityDefinitionControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data =
            await updateActivityDefinitionController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Permanently deletes an ActivityDefinition. */
export const deleteActivityDefinitionAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteActivityDefinitionActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteActivityDefinitionAction }) => {
    return await runWithTransport<TDeleteActivityDefinitionControllerOutput>(
      async () => {
        const data = await deleteActivityDefinitionController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/**
 * Applies a ActivityDefinition to a subject (FHIR `$apply`). `persist=false` previews only.
 * org_id is always taken from the session, never from the client payload.
 */
export const applyActivityDefinitionAction = authenticatedProcedure
  .createServerAction()
  .input(ApplyActivityDefinitionActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TApplyActivityDefinitionAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TApplyActivityDefinitionControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await applyActivityDefinitionController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );
