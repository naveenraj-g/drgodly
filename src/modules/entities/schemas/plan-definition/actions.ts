/**
 * PlanDefinition ZSA server action schemas.
 *
 * Layer: entities / schemas / plan-definition
 *
 * Wraps validation schemas in the ZSA action payload envelope:
 *  - Mutating operations include `transportOptions` for cache revalidation.
 *  - Read operations (list, getById) do not.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreatePlanDefinitionValidationSchema,
  PatchPlanDefinitionValidationSchema,
  ListPlanDefinitionsValidationSchema,
  GetPlanDefinitionByIdValidationSchema,
  DeletePlanDefinitionValidationSchema,
  ApplyPlanDefinitionValidationSchema,
} from "./input";

export const CreatePlanDefinitionActionSchema = z.object({
  payload: CreatePlanDefinitionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreatePlanDefinitionAction = z.infer<
  typeof CreatePlanDefinitionActionSchema
>;

export const ListPlanDefinitionsActionSchema = z.object({
  payload: ListPlanDefinitionsValidationSchema.optional(),
});
export type TListPlanDefinitionsAction = z.infer<
  typeof ListPlanDefinitionsActionSchema
>;

export const GetPlanDefinitionByIdActionSchema = z.object({
  payload: GetPlanDefinitionByIdValidationSchema,
});
export type TGetPlanDefinitionByIdAction = z.infer<
  typeof GetPlanDefinitionByIdActionSchema
>;

export const UpdatePlanDefinitionActionSchema = z.object({
  payload: PatchPlanDefinitionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdatePlanDefinitionAction = z.infer<
  typeof UpdatePlanDefinitionActionSchema
>;

export const DeletePlanDefinitionActionSchema = z.object({
  payload: DeletePlanDefinitionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePlanDefinitionAction = z.infer<
  typeof DeletePlanDefinitionActionSchema
>;

export const ApplyPlanDefinitionActionSchema = z.object({
  payload: ApplyPlanDefinitionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TApplyPlanDefinitionAction = z.infer<typeof ApplyPlanDefinitionActionSchema>;
