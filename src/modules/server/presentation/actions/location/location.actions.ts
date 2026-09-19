/**
 * Location server actions — presentation layer ZSA actions.
 *
 * Layer: presentation / actions
 * Resource: Location
 *
 * All actions use adminProcedure — Location is an admin-only resource with
 * no patient-facing read path, so every action is gated behind
 * ROLES["telemedicine-admin"] from creation.
 * Mutating actions include transportOptions for revalidation / redirect.
 * Read actions have no transportOptions — no side effects.
 */

"use server";

import type { AuthResponse } from "@/modules/server/auth/types";
import {
  CreateLocationActionSchema,
  DeleteLocationActionSchema,
  GetLocationByIdActionSchema,
  ListLocationsActionSchema,
  UpdateLocationActionSchema,
  type TCreateLocationAction,
  type TDeleteLocationAction,
  type TGetLocationByIdAction,
  type TListLocationsAction,
  type TUpdateLocationAction,
} from "@/modules/entities/schemas/location";
import {
  createLocationController,
  deleteLocationController,
  getLocationByIdController,
  listLocationsController,
  updateLocationController,
  type TCreateLocationControllerOutput,
  type TDeleteLocationControllerOutput,
  type TGetLocationByIdControllerOutput,
  type TListLocationsControllerOutput,
  type TUpdateLocationControllerOutput,
} from "@/modules/server/core/location/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { adminProcedure } from "../procedures";

/** Creates a new location. Accepts transportOptions for post-create revalidation. */
export const createLocationAction = adminProcedure
  .createServerAction()
  .input(CreateLocationActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateLocationAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateLocationControllerOutput>(
        async () => {
          // Merge session org_id into the payload — prevents client from supplying
          // a different org_id. org_id is required here; "" falls through to the
          // schema's own min(1) validation if the session has no active org.
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? "",
          };
          const data = await createLocationController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        }
      );
    }
  );

/** Lists locations with optional server-side filters and pagination. */
export const listLocationsAction = adminProcedure
  .createServerAction()
  .input(ListLocationsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListLocationsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListLocationsControllerOutput>(
        async () => {
          // Merge session org_id into the payload — prevents client from supplying a different org_id
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listLocationsController(enrichedPayload);
          return { result: data };
        }
      );
    }
  );

/** Fetches a single location by its numeric ID. */
export const getLocationByIdAction = adminProcedure
  .createServerAction()
  .input(GetLocationByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetLocationByIdAction }) => {
    return await runWithTransport<TGetLocationByIdControllerOutput>(
      async () => {
        const data = await getLocationByIdController(input.payload);
        return { result: data };
      }
    );
  });

/** Partially updates a location (scalar fields only — see PatchLocationDtoSchema). */
export const updateLocationAction = adminProcedure
  .createServerAction()
  .input(UpdateLocationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateLocationAction }) => {
    return await runWithTransport<TUpdateLocationControllerOutput>(
      async () => {
        const data = await updateLocationController(input.payload);
        return { result: data, transport: input.transportOptions };
      }
    );
  });

/** Permanently deletes a location. */
export const deleteLocationAction = adminProcedure
  .createServerAction()
  .input(DeleteLocationActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteLocationAction }) => {
    return await runWithTransport<TDeleteLocationControllerOutput>(
      async () => {
        await deleteLocationController(input.payload);
        return { result: undefined, transport: input.transportOptions };
      }
    );
  });
