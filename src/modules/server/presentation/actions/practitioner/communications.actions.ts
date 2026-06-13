/**
 * Practitioner communication sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — /communications sub-resource
 *
 * All actions use authenticatedProcedure. Mutating actions include transportOptions
 * for cache revalidation; list does not.
 */

"use server";

import {
  AddPractitionerCommunicationActionSchema,
  DeletePractitionerCommunicationActionSchema,
  ListPractitionerCommunicationsActionSchema,
  PatchPractitionerCommunicationActionSchema,
  type TAddPractitionerCommunicationAction,
  type TDeletePractitionerCommunicationAction,
  type TListPractitionerCommunicationsAction,
  type TPatchPractitionerCommunicationAction,
} from "@/modules/entities/schemas/practitioner";
import {
  addPractitionerCommunicationController,
  deletePractitionerCommunicationController,
  listPractitionerCommunicationsController,
  patchPractitionerCommunicationController,
  type TAddPractitionerCommunicationControllerOutput,
  type TListPractitionerCommunicationsControllerOutput,
  type TPatchPractitionerCommunicationControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Adds a language preference to a Practitioner. */
export const addPractitionerCommunicationAction = authenticatedProcedure
  .createServerAction()
  .input(AddPractitionerCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPractitionerCommunicationAction }) => {
    return await runWithTransport<TAddPractitionerCommunicationControllerOutput>(async () => {
      const data = await addPractitionerCommunicationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all communication records for a Practitioner. */
export const listPractitionerCommunicationsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionerCommunicationsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerCommunicationsAction }) => {
    return await runWithTransport<TListPractitionerCommunicationsControllerOutput>(async () => {
      const data = await listPractitionerCommunicationsController(input.payload);
      return { result: data };
    });
  });

/** Patches a language preference on a Practitioner. */
export const patchPractitionerCommunicationAction = authenticatedProcedure
  .createServerAction()
  .input(PatchPractitionerCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPractitionerCommunicationAction }) => {
    return await runWithTransport<TPatchPractitionerCommunicationControllerOutput>(async () => {
      const data = await patchPractitionerCommunicationController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a communication record from a Practitioner. */
export const deletePractitionerCommunicationAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePractitionerCommunicationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerCommunicationAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerCommunicationController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
