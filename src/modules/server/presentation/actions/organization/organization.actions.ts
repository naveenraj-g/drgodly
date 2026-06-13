/**
 * Organization server actions — presentation layer ZSA actions.
 *
 * Layer: presentation / actions
 * Resource: Organization
 *
 * All mutating actions (register, update, delete) use authenticatedProcedure — the caller
 * must have an active admin role. Read actions (list, getById) use authenticatedProcedure
 * too since organization data is restricted to admin users.
 * Mutating actions include transportOptions for revalidation / redirect.
 * Read actions have no transportOptions — no side effects.
 */

"use server";

import {
  DeleteOrgActionSchema,
  GetOrgByIdActionSchema,
  ListOrgsActionSchema,
  PatchOrgActionSchema,
  RegisterOrgActionSchema,
  type TDeleteOrgAction,
  type TGetOrgByIdAction,
  type TListOrgsAction,
  type TPatchOrgAction,
  type TRegisterOrgAction,
} from "@/modules/entities/schemas/organization";
import {
  deleteOrganizationController,
  getOrganizationByIdController,
  listOrganizationsController,
  registerOrganizationController,
  updateOrganizationController,
  type TDeleteOrganizationControllerOutput,
  type TGetOrganizationByIdControllerOutput,
  type TListOrganizationsControllerOutput,
  type TRegisterOrganizationControllerOutput,
  type TUpdateOrganizationControllerOutput,
} from "@/modules/server/core/organization/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Creates a new organization. Accepts transportOptions for post-create revalidation. */
export const registerOrganizationAction = authenticatedProcedure
  .createServerAction()
  .input(RegisterOrgActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TRegisterOrgAction }) => {
    return await runWithTransport<TRegisterOrganizationControllerOutput>(
      async () => {
        const data = await registerOrganizationController(input.payload);
        return { result: data, transport: input.transportOptions };
      }
    );
  });

/** Lists organizations with optional server-side filters and pagination. */
export const listOrganizationsAction = authenticatedProcedure
  .createServerAction()
  .input(ListOrgsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListOrgsAction }) => {
    return await runWithTransport<TListOrganizationsControllerOutput>(
      async () => {
        const data = await listOrganizationsController(input.payload);
        return { result: data };
      }
    );
  });

/** Fetches a single organization by its numeric ID. */
export const getOrganizationByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetOrgByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetOrgByIdAction }) => {
    return await runWithTransport<TGetOrganizationByIdControllerOutput>(
      async () => {
        const data = await getOrganizationByIdController(input.payload);
        return { result: data };
      }
    );
  });

/** Partially updates an organization (name, active, partof_display only). */
export const updateOrganizationAction = authenticatedProcedure
  .createServerAction()
  .input(PatchOrgActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TPatchOrgAction }) => {
    return await runWithTransport<TUpdateOrganizationControllerOutput>(
      async () => {
        const data = await updateOrganizationController(input.payload);
        return { result: data, transport: input.transportOptions };
      }
    );
  });

/** Permanently deletes an organization and its child records. */
export const deleteOrganizationAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteOrgActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteOrgAction }) => {
    return await runWithTransport<TDeleteOrganizationControllerOutput>(
      async () => {
        await deleteOrganizationController(input.payload);
        return { result: undefined, transport: input.transportOptions };
      }
    );
  });
