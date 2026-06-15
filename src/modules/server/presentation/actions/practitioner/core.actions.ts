/**
 * Practitioner core server actions — create, list, getMe, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Practitioner (FHIR R4) — core operations
 *
 * All actions use authenticatedProcedure — practitioner records are managed by
 * telemedicine-admin users. Mutating actions include transportOptions for
 * cache revalidation; read actions do not.
 */

"use server";

import {
  CreatePractitionerActionSchema,
  CreatePractitionerFullActionSchema,
  DeletePractitionerActionSchema,
  GetPractitionerByIdActionSchema,
  ListPractitionersActionSchema,
  UpdatePractitionerActionSchema,
  UpdatePractitionerFullActionSchema,
  type TCreatePractitionerAction,
  type TCreatePractitionerFullAction,
  type TDeletePractitionerAction,
  type TGetPractitionerByIdAction,
  type TListPractitionersAction,
  type TUpdatePractitionerAction,
  type TUpdatePractitionerFullAction,
} from "@/modules/entities/schemas/practitioner";
import {
  createPractitionerController,
  createPractitionerFullController,
  deletePractitionerController,
  getMyPractitionerController,
  getPractitionerByIdController,
  listPractitionersController,
  updatePractitionerController,
  updatePractitionerFullController,
  type TCreatePractitionerControllerOutput,
  type TCreatePractitionerFullControllerOutput,
  type TGetMyPractitionerControllerOutput,
  type TGetPractitionerByIdControllerOutput,
  type TListPractitionersControllerOutput,
  type TUpdatePractitionerControllerOutput,
  type TUpdatePractitionerFullControllerOutput,
} from "@/modules/server/core/practitioner/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Atomically creates a Practitioner with sub-resources in a single request. */
export const createPractitionerFullAction = authenticatedProcedure
  .createServerAction()
  .input(CreatePractitionerFullActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreatePractitionerFullAction }) => {
    return await runWithTransport<TCreatePractitionerFullControllerOutput>(
      async () => {
        const data = await createPractitionerFullController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Atomically updates a Practitioner's scalar fields and sub-resource arrays in a single request. */
export const updatePractitionerFullAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePractitionerFullActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePractitionerFullAction }) => {
    return await runWithTransport<TUpdatePractitionerFullControllerOutput>(
      async () => {
        const data = await updatePractitionerFullController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Creates a new Practitioner record. Accepts transportOptions for post-create revalidation. */
export const createPractitionerAction = authenticatedProcedure
  .createServerAction()
  .input(CreatePractitionerActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreatePractitionerAction }) => {
    return await runWithTransport<TCreatePractitionerControllerOutput>(
      async () => {
        const data = await createPractitionerController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Lists Practitioners with optional server-side filters and pagination. */
export const listPractitionersAction = authenticatedProcedure
  .createServerAction()
  .input(ListPractitionersActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListPractitionersAction }) => {
    return await runWithTransport<TListPractitionersControllerOutput>(
      async () => {
        const data = await listPractitionersController(input.payload);
        return { result: data };
      },
    );
  });

/**
 * Fetches the Practitioner record linked to the currently authenticated user.
 * No input required — userId is resolved from the session.
 */
export const getMyPractitionerAction = authenticatedProcedure
  .createServerAction()
  .handler(async () => {
    return await runWithTransport<TGetMyPractitionerControllerOutput>(
      async () => {
        const data = await getMyPractitionerController();
        return { result: data };
      },
    );
  });

/** Fetches a single Practitioner by numeric ID. */
export const getPractitionerByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetPractitionerByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetPractitionerByIdAction }) => {
    return await runWithTransport<TGetPractitionerByIdControllerOutput>(
      async () => {
        const data = await getPractitionerByIdController(input.payload);
        return { result: data };
      },
    );
  });

/** Partially updates scalar fields on a Practitioner. Accepts transportOptions for revalidation. */
export const updatePractitionerAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePractitionerActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePractitionerAction }) => {
    return await runWithTransport<TUpdatePractitionerControllerOutput>(
      async () => {
        const data = await updatePractitionerController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Permanently removes a Practitioner and all child records. Accepts transportOptions for revalidation. */
export const deletePractitionerAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePractitionerActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePractitionerAction }) => {
    return await runWithTransport<void>(async () => {
      await deletePractitionerController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
