/**
 * Patient core server actions — create, list, getMe, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Patient (FHIR R4) — core operations
 *
 * All actions use authenticatedProcedure — any signed-in user may manage their
 * own Patient record. Mutating actions include transportOptions for cache
 * revalidation; read actions do not.
 */

"use server";

import type { AuthResponse } from "@/modules/server/auth/types";
import {
  CreatePatientActionSchema,
  CreatePatientFullActionSchema,
  DeletePatientActionSchema,
  GetPatientByIdActionSchema,
  ListPatientsActionSchema,
  UpdatePatientActionSchema,
  UpdatePatientFullActionSchema,
  type TCreatePatientAction,
  type TCreatePatientFullAction,
  type TDeletePatientAction,
  type TGetPatientByIdAction,
  type TListPatientsAction,
  type TUpdatePatientAction,
  type TUpdatePatientFullAction,
} from "@/modules/entities/schemas/patient";
import {
  createPatientController,
  createPatientFullController,
  deletePatientController,
  getPatientByIdController,
  getPatientMeController,
  listPatientsController,
  updatePatientController,
  updatePatientFullController,
  type TCreatePatientControllerOutput,
  type TCreatePatientFullControllerOutput,
  type TDeletePatientControllerOutput,
  type TGetPatientByIdControllerOutput,
  type TGetPatientMeControllerOutput,
  type TListPatientsControllerOutput,
  type TUpdatePatientControllerOutput,
  type TUpdatePatientFullControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Atomically creates a Patient with sub-resources in a single request. */
export const createPatientFullAction = authenticatedProcedure
  .createServerAction()
  .input(CreatePatientFullActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreatePatientFullAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreatePatientFullControllerOutput>(
        async () => {
          // Merge session org_id into the payload — prevents client from supplying
          // a different org_id. org_id is required here; "" falls through to the
          // schema's own min(1) validation if the session has no active org.
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? "",
          };
          const data = await createPatientFullController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Atomically updates a Patient's scalar fields and sub-resource arrays in a single request. */
export const updatePatientFullAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePatientFullActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePatientFullAction }) => {
    return await runWithTransport<TUpdatePatientFullControllerOutput>(
      async () => {
        const data = await updatePatientFullController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Creates a new Patient record. Accepts transportOptions for post-create revalidation. */
export const createPatientAction = authenticatedProcedure
  .createServerAction()
  .input(CreatePatientActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreatePatientAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreatePatientControllerOutput>(
        async () => {
          // Merge session org_id into the payload — prevents client from supplying
          // a different org_id. org_id is required here; "" falls through to the
          // schema's own min(1) validation if the session has no active org.
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? "",
          };
          const data = await createPatientController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Lists patients with optional server-side filters and pagination. */
export const listPatientsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListPatientsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListPatientsControllerOutput>(
        async () => {
          // Merge session org_id into the payload — prevents client from supplying a different org_id
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listPatientsController(enrichedPayload);
          return { result: data };
        },
      );
    },
  );

/** Fetches the authenticated user's own Patient record. */
export const getPatientMeAction = authenticatedProcedure
  .createServerAction()
  .handler(async () => {
    return await runWithTransport<TGetPatientMeControllerOutput>(async () => {
      const data = await getPatientMeController();
      return { result: data };
    });
  });

/** Fetches a single Patient by numeric ID. */
export const getPatientByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetPatientByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetPatientByIdAction }) => {
    return await runWithTransport<TGetPatientByIdControllerOutput>(async () => {
      const data = await getPatientByIdController(input.payload);
      return { result: data };
    });
  });

/** Partially updates scalar fields on a Patient. Accepts transportOptions for revalidation. */
export const updatePatientAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePatientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdatePatientAction }) => {
    return await runWithTransport<TUpdatePatientControllerOutput>(async () => {
      const data = await updatePatientController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently removes a Patient and all child records. Accepts transportOptions for revalidation. */
export const deletePatientAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeletePatientAction }) => {
    return await runWithTransport<TDeletePatientControllerOutput>(async () => {
      const data = await deletePatientController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
