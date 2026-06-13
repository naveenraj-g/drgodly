/**
 * Practitioner photo sub-resource server actions — add, list, patch, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — /photos sub-resource
 *
 * All actions use adminProcedure. Mutating actions include transportOptions
 * for cache revalidation; list does not.
 */

"use server";

import {
  AddPractitionerPhotoActionSchema,
  DeletePractitionerPhotoActionSchema,
  ListPractitionerPhotosActionSchema,
  PatchPractitionerPhotoActionSchema,
  type TAddPractitionerPhotoAction,
  type TDeletePractitionerPhotoAction,
  type TListPractitionerPhotosAction,
  type TPatchPractitionerPhotoAction,
} from "@/modules/entities/schemas/practitioner";
import {
  addPractitionerPhotoController,
  deletePractitionerPhotoController,
  listPractitionerPhotosController,
  patchPractitionerPhotoController,
  type TAddPractitionerPhotoControllerOutput,
  type TListPractitionerPhotosControllerOutput,
  type TPatchPractitionerPhotoControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { adminProcedure } from "../procedures";

/** Adds a photo Attachment to a Practitioner. */
export const addPractitionerPhotoAction = adminProcedure
  .createServerAction()
  .input(AddPractitionerPhotoActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TAddPractitionerPhotoAction }) => {
    return await runWithTransport<TAddPractitionerPhotoControllerOutput>(async () => {
      const data = await addPractitionerPhotoController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Lists all photo records for a Practitioner. */
export const listPractitionerPhotosAction = adminProcedure
  .createServerAction()
  .input(ListPractitionerPhotosActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionerPhotosAction }) => {
    return await runWithTransport<TListPractitionerPhotosControllerOutput>(async () => {
      const data = await listPractitionerPhotosController(input.payload);
      return { result: data };
    });
  });

/** Patches a photo Attachment on a Practitioner. */
export const patchPractitionerPhotoAction = adminProcedure
  .createServerAction()
  .input(PatchPractitionerPhotoActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchPractitionerPhotoAction }) => {
    return await runWithTransport<TPatchPractitionerPhotoControllerOutput>(async () => {
      const data = await patchPractitionerPhotoController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Removes a photo record from a Practitioner. */
export const deletePractitionerPhotoAction = adminProcedure
  .createServerAction()
  .input(DeletePractitionerPhotoActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerPhotoAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerPhotoController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
