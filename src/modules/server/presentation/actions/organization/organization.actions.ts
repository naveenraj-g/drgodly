/**
 * Organization server actions — presentation layer ZSA actions.
 *
 * Layer: presentation / actions
 * Resource: Organization
 *
 * All actions use adminProcedure — the caller must have an active session with
 * a role in ROLES["telemedicine-admin"], since organization data is
 * admin-only. This is enforced at the procedure layer here in addition to the
 * route-level requireRole() guard in the admin layout.
 * Mutating actions include transportOptions for revalidation / redirect.
 * Read actions have no transportOptions — no side effects.
 *
 * The one exception is `getMyOrganizationAction` — authenticatedProcedure,
 * since any signed-in user (doctor or patient) needs their own clinic's
 * name/address/phone for letterhead display (Prescription/Lab-Request
 * sheets). It derives org_id from the session, never from client input, so
 * it can only ever return the caller's own tenant's organization.
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
  type TOrgResponse,
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
import type { AuthResponse } from "@/modules/server/auth/types";
import { adminProcedure, authenticatedProcedure } from "../procedures";

/** Creates a new organization. Accepts transportOptions for post-create revalidation. */
export const registerOrganizationAction = adminProcedure
  .createServerAction()
  .input(RegisterOrgActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TRegisterOrgAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TRegisterOrganizationControllerOutput>(
        async () => {
          // Merge session org_id into the payload — prevents client from supplying a different org_id
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await registerOrganizationController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        }
      );
    }
  );

/** Lists organizations with optional server-side filters and pagination. */
export const listOrganizationsAction = adminProcedure
  .createServerAction()
  .input(ListOrgsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListOrgsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListOrganizationsControllerOutput>(
        async () => {
          // Merge session org_id into the payload — prevents client from supplying a different org_id
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listOrganizationsController(enrichedPayload);
          return { result: data };
        }
      );
    }
  );

/** Fetches a single organization by its numeric ID. */
export const getOrganizationByIdAction = adminProcedure
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
export const updateOrganizationAction = adminProcedure
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

/**
 * Fetches the signed-in user's own tenant organization — the clinic's
 * name/address/telecom/identifier for letterhead display. No input: org_id
 * is resolved from the session's active organization, never from the
 * caller, so this can't be used to look up another tenant's organization.
 */
export const getMyOrganizationAction = authenticatedProcedure
  .createServerAction()
  .handler(async ({ ctx }: { ctx: { session: AuthResponse } }) => {
    return await runWithTransport<TOrgResponse | null>(async () => {
      const orgId = ctx.session.session.activeOrganizationId;
      if (!orgId) return { result: null };
      const page = await listOrganizationsController({
        org_id: orgId,
        limit: 1,
      });
      return { result: page.data[0] ?? null };
    });
  });

/** Permanently deletes an organization and its child records. */
export const deleteOrganizationAction = adminProcedure
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
