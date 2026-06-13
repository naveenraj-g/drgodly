/**
 * Slot core server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Slot (FHIR R4) — all operations
 *
 * All actions use authenticatedProcedure — Slot records are managed by
 * telemedicine-admin users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import {
  CreateSlotActionSchema,
  ListSlotsActionSchema,
  GetSlotByIdActionSchema,
  UpdateSlotActionSchema,
  DeleteSlotActionSchema,
  type TCreateSlotAction,
  type TListSlotsAction,
  type TGetSlotByIdAction,
  type TUpdateSlotAction,
  type TDeleteSlotAction,
} from "@/modules/entities/schemas/slot";
import {
  createSlotController,
  listSlotsController,
  getSlotByIdController,
  updateSlotController,
  deleteSlotController,
  type TCreateSlotControllerOutput,
  type TListSlotsControllerOutput,
  type TGetSlotByIdControllerOutput,
  type TUpdateSlotControllerOutput,
} from "@/modules/server/core/slot/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Creates a Slot with all inline child arrays (schedule + status required). */
export const createSlotAction = authenticatedProcedure
  .createServerAction()
  .input(CreateSlotActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateSlotAction }) => {
    return await runWithTransport<TCreateSlotControllerOutput>(async () => {
      const data = await createSlotController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists Slots with optional server-side filters (status, schedule_id, practitioner_role_id, etc.). */
export const listSlotsAction = authenticatedProcedure
  .createServerAction()
  .input(ListSlotsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListSlotsAction }) => {
    return await runWithTransport<TListSlotsControllerOutput>(async () => {
      const data = await listSlotsController(input.payload);
      return { result: data };
    });
  });

/** Fetches a single Slot by numeric ID. */
export const getSlotByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetSlotByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetSlotByIdAction }) => {
    return await runWithTransport<TGetSlotByIdControllerOutput>(async () => {
      const data = await getSlotByIdController(input.payload);
      return { result: data };
    });
  });

/**
 * Patches scalar fields on a Slot (status, start, end, overbooked, comment, appointment_type_*).
 * Child arrays and schedule reference cannot be patched.
 */
export const updateSlotAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateSlotActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateSlotAction }) => {
    return await runWithTransport<TUpdateSlotControllerOutput>(async () => {
      const data = await updateSlotController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a Slot and all child records (cascade). */
export const deleteSlotAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteSlotActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteSlotAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteSlotController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
