/**
 * Vitals server actions — presentation layer ZSA actions.
 *
 * Layer: presentation / actions
 * Resource: Vitals (custom, non-FHIR — wearable/manual health and activity metrics)
 *
 * All actions use authenticatedProcedure — Vitals is patient-facing (wearable
 * sync / self-reported metrics), not an admin-only resource.
 * Mutating actions include transportOptions for revalidation / redirect.
 * Read actions have no transportOptions — no side effects.
 *
 * org_id is always stamped from the session, same as every other
 * FHIR_GQL_URL-backed resource — never trusted from the client. user_id is
 * left as an optional pass-through field from the client payload (not
 * session-stamped) since fhir-gql resolves the linked patient from the
 * caller's JWT sub claim when it's omitted, and a client may legitimately
 * bind a wearable sync to a specific user_id it already knows.
 */

"use server";

import {
  CreateVitalsActionSchema,
  DeleteVitalsActionSchema,
  GetVitalsByIdActionSchema,
  ListVitalsActionSchema,
  UpdateVitalsActionSchema,
  type TCreateVitalsAction,
  type TDeleteVitalsAction,
  type TGetVitalsByIdAction,
  type TListVitalsAction,
  type TUpdateVitalsAction,
} from "@/modules/entities/schemas/vitals";
import {
  createVitalsController,
  deleteVitalsController,
  getVitalsByIdController,
  listVitalsController,
  updateVitalsController,
  type TCreateVitalsControllerOutput,
  type TDeleteVitalsControllerOutput,
  type TGetVitalsByIdControllerOutput,
  type TListVitalsControllerOutput,
  type TUpdateVitalsControllerOutput,
} from "@/modules/server/core/vitals/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Records a new vitals entry. Accepts transportOptions for post-create revalidation. */
export const createVitalsAction = authenticatedProcedure
  .createServerAction()
  .input(CreateVitalsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateVitalsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateVitalsControllerOutput>(async () => {
        // Merge session org_id into the payload — prevents client from supplying a different org_id
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await createVitalsController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Lists vitals entries with optional server-side filters and pagination. */
export const listVitalsAction = authenticatedProcedure
  .createServerAction()
  .input(ListVitalsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListVitalsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListVitalsControllerOutput>(async () => {
        // Merge session org_id into the payload — prevents client from supplying a different org_id
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await listVitalsController(enrichedPayload);
        return { result: data };
      });
    },
  );

/** Fetches a single vitals entry by its public numeric ID. */
export const getVitalsByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetVitalsByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetVitalsByIdAction }) => {
    return await runWithTransport<TGetVitalsByIdControllerOutput>(async () => {
      const data = await getVitalsByIdController(input.payload);
      return { result: data };
    });
  });

/** Partially updates a vitals entry (metric fields only). */
export const updateVitalsAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateVitalsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateVitalsAction }) => {
    return await runWithTransport<TUpdateVitalsControllerOutput>(async () => {
      const data = await updateVitalsController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

/** Permanently deletes a vitals entry. */
export const deleteVitalsAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteVitalsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteVitalsAction }) => {
    return await runWithTransport<TDeleteVitalsControllerOutput>(async () => {
      await deleteVitalsController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
