/**
 * MedicationRequest core server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: MedicationRequest (FHIR R5) — all operations
 *
 * All actions use authenticatedProcedure — MedicationRequest records are managed by
 * authenticated telemedicine users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import {
  CreateMedicationRequestActionSchema,
  ListMedicationRequestsActionSchema,
  GetMedicationRequestByIdActionSchema,
  UpdateMedicationRequestActionSchema,
  DeleteMedicationRequestActionSchema,
  type TCreateMedicationRequestAction,
  type TListMedicationRequestsAction,
  type TGetMedicationRequestByIdAction,
  type TUpdateMedicationRequestAction,
  type TDeleteMedicationRequestAction,
} from "@/modules/entities/schemas/medication-request";
import {
  createMedicationRequestController,
  listMedicationRequestsController,
  getMedicationRequestByIdController,
  updateMedicationRequestController,
  deleteMedicationRequestController,
  type TCreateMedicationRequestControllerOutput,
  type TListMedicationRequestsControllerOutput,
  type TGetMedicationRequestByIdControllerOutput,
  type TUpdateMedicationRequestControllerOutput,
} from "@/modules/server/core/medication-request/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a MedicationRequest (status + intent required). */
export const createMedicationRequestAction = authenticatedProcedure
  .createServerAction()
  .input(CreateMedicationRequestActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateMedicationRequestAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateMedicationRequestControllerOutput>(async () => {
        // Merge session org_id into the payload — prevents client from supplying a different org_id
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await createMedicationRequestController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Lists MedicationRequests with optional filters (status, patient_id, authored_from/to, etc.). */
export const listMedicationRequestsAction = authenticatedProcedure
  .createServerAction()
  .input(ListMedicationRequestsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListMedicationRequestsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListMedicationRequestsControllerOutput>(async () => {
        // Merge session org_id into the payload — prevents client from supplying a different org_id
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await listMedicationRequestsController(enrichedPayload);
        return { result: data };
      });
    },
  );

/** Fetches a single MedicationRequest by numeric ID. */
export const getMedicationRequestByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetMedicationRequestByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetMedicationRequestByIdAction }) => {
    return await runWithTransport<TGetMedicationRequestByIdControllerOutput>(async () => {
      const data = await getMedicationRequestByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches scalar fields on a MedicationRequest (status, intent, priority, authored_on, etc.). */
export const updateMedicationRequestAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateMedicationRequestActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateMedicationRequestAction }) => {
    return await runWithTransport<TUpdateMedicationRequestControllerOutput>(async () => {
      const data = await updateMedicationRequestController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a MedicationRequest and all child records (cascade). */
export const deleteMedicationRequestAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteMedicationRequestActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteMedicationRequestAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteMedicationRequestController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
