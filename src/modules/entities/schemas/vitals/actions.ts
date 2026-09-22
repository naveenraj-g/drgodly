/**
 * Vitals ZSA action schemas.
 *
 * Layer: entities / schemas / vitals
 *
 * Wraps every input validation schema in the ZSA action envelope:
 *  - Mutating operations include `transportOptions` for cache revalidation.
 *  - Read operations (list, getById) do not.
 *
 * Imports validation schemas from "./input" (relative) to avoid circular
 * barrel self-import when this file is re-exported from index.ts.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateVitalsValidationSchema,
  PatchVitalsValidationSchema,
  ListVitalsValidationSchema,
  GetVitalsByIdValidationSchema,
  DeleteVitalsValidationSchema,
} from "./input";

export const CreateVitalsActionSchema = z.object({
  payload: CreateVitalsValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateVitalsAction = z.infer<typeof CreateVitalsActionSchema>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListVitalsActionSchema = z.object({
  payload: ListVitalsValidationSchema.optional(),
});
export type TListVitalsAction = z.infer<typeof ListVitalsActionSchema>;

export const GetVitalsByIdActionSchema = z.object({
  payload: GetVitalsByIdValidationSchema,
});
export type TGetVitalsByIdAction = z.infer<typeof GetVitalsByIdActionSchema>;

export const UpdateVitalsActionSchema = z.object({
  payload: PatchVitalsValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateVitalsAction = z.infer<typeof UpdateVitalsActionSchema>;

export const DeleteVitalsActionSchema = z.object({
  payload: DeleteVitalsValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteVitalsAction = z.infer<typeof DeleteVitalsActionSchema>;
