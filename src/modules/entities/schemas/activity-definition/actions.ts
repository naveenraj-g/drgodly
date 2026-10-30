/**
 * ActivityDefinition ZSA action schemas.
 *
 * Layer: entities / schemas / activity-definition
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
  CreateActivityDefinitionValidationSchema,
  PatchActivityDefinitionValidationSchema,
  ListActivityDefinitionsValidationSchema,
  GetByIdActivityDefinitionValidationSchema,
  DeleteActivityDefinitionValidationSchema,
  ApplyActivityDefinitionValidationSchema,
} from "./input";

export const CreateActivityDefinitionActionSchema = z.object({
  payload: CreateActivityDefinitionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateActivityDefinitionAction = z.infer<
  typeof CreateActivityDefinitionActionSchema
>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListActivityDefinitionsActionSchema = z.object({
  payload: ListActivityDefinitionsValidationSchema.optional(),
});
export type TListActivityDefinitionsAction = z.infer<
  typeof ListActivityDefinitionsActionSchema
>;

export const GetByIdActivityDefinitionActionSchema = z.object({
  payload: GetByIdActivityDefinitionValidationSchema,
});
export type TGetByIdActivityDefinitionAction = z.infer<
  typeof GetByIdActivityDefinitionActionSchema
>;

export const UpdateActivityDefinitionActionSchema = z.object({
  payload: PatchActivityDefinitionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateActivityDefinitionAction = z.infer<
  typeof UpdateActivityDefinitionActionSchema
>;

export const DeleteActivityDefinitionActionSchema = z.object({
  payload: DeleteActivityDefinitionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteActivityDefinitionAction = z.infer<
  typeof DeleteActivityDefinitionActionSchema
>;

export const ApplyActivityDefinitionActionSchema = z.object({
  payload: ApplyActivityDefinitionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TApplyActivityDefinitionAction = z.infer<typeof ApplyActivityDefinitionActionSchema>;
