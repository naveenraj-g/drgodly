/**
 * Practitioner telecom sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — /telecom sub-resource
 *
 * All actions use adminProcedure. Mutating actions include transportOptions
 * for cache revalidation; list does not.
 */

"use server";

import {
  AddPractitionerTelecomActionSchema,
  DeletePractitionerTelecomActionSchema,
  ListPractitionerTelecomActionSchema,
  PatchPractitionerTelecomActionSchema,
  type TAddPractitionerTelecomAction,
  type TDeletePractitionerTelecomAction,
  type TListPractitionerTelecomAction,
  type TPatchPractitionerTelecomAction,
} from "@/modules/entities/schemas/practitioner";
import {
  addPractitionerTelecomController,
  deletePractitionerTelecomController,
  listPractitionerTelecomController,
  patchPractitionerTelecomController,
  type TAddPractitionerTelecomControllerOutput,
  type TListPractitionerTelecomControllerOutput,
  type TPatchPractitionerTelecomControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { adminProcedure } from "../procedures";

/** Adds a ContactPoint (phone, email, etc.) to a Practitioner. */
export const addPractitionerTelecomAction = adminProcedure
  .createServerAction()
  .input(AddPractitionerTelecomActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPractitionerTelecomAction }) => {
    return await runWithTransport<TAddPractitionerTelecomControllerOutput>(async () => {
      const data = await addPractitionerTelecomController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all telecom records for a Practitioner. */
export const listPractitionerTelecomAction = adminProcedure
  .createServerAction()
  .input(ListPractitionerTelecomActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerTelecomAction }) => {
    return await runWithTransport<TListPractitionerTelecomControllerOutput>(async () => {
      const data = await listPractitionerTelecomController(input.payload);
      return { result: data };
    });
  });

/** Patches a ContactPoint on a Practitioner. */
export const patchPractitionerTelecomAction = adminProcedure
  .createServerAction()
  .input(PatchPractitionerTelecomActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPractitionerTelecomAction }) => {
    return await runWithTransport<TPatchPractitionerTelecomControllerOutput>(async () => {
      const data = await patchPractitionerTelecomController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a telecom record from a Practitioner. */
export const deletePractitionerTelecomAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerTelecomActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerTelecomAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerTelecomController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
