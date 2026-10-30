/**
 * CarePlan server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: CarePlan (FHIR R4)
 */

"use server";

import {
  CreateCarePlanActionSchema,
  ListCarePlansActionSchema,
  GetCarePlanByIdActionSchema,
  UpdateCarePlanActionSchema,
  DeleteCarePlanActionSchema,
  type TCreateCarePlanAction,
  type TListCarePlansAction,
  type TGetCarePlanByIdAction,
  type TUpdateCarePlanAction,
  type TDeleteCarePlanAction,
} from "@/modules/entities/schemas/care-plan";
import {
  createCarePlanController,
  listCarePlansController,
  getCarePlanByIdController,
  updateCarePlanController,
  deleteCarePlanController,
  type TCreateCarePlanControllerOutput,
  type TListCarePlansControllerOutput,
  type TGetCarePlanByIdControllerOutput,
  type TUpdateCarePlanControllerOutput,
} from "@/modules/server/core/care-plan/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a CarePlan. */
export const createCarePlanAction = authenticatedProcedure
  .createServerAction()
  .input(CreateCarePlanActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateCarePlanAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateCarePlanControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await createCarePlanController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Lists CarePlans with optional filters. */
export const listCarePlansAction = authenticatedProcedure
  .createServerAction()
  .input(ListCarePlansActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListCarePlansAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListCarePlansControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listCarePlansController(enrichedPayload);
          return { result: data };
        },
      );
    },
  );

/** Fetches a single CarePlan by numeric ID. */
export const getCarePlanByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetCarePlanByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetCarePlanByIdAction }) => {
    return await runWithTransport<TGetCarePlanByIdControllerOutput>(
      async () => {
        const data = await getCarePlanByIdController(input.payload);
        return { result: data };
      },
    );
  });

/** Patches a CarePlan by ID. */
export const updateCarePlanAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateCarePlanActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateCarePlanAction }) => {
    return await runWithTransport<TUpdateCarePlanControllerOutput>(
      async () => {
        const data = await updateCarePlanController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Deletes a CarePlan by numeric ID. */
export const deleteCarePlanAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteCarePlanActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteCarePlanAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteCarePlanController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
