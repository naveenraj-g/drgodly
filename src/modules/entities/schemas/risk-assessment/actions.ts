/**
 * RiskAssessment ZSA action schemas.
 *
 * Layer: entities / schemas / risk-assessment
 *
 * Wraps every input validation schema in the ZSA action envelope:
 *  - Mutating operations include `transportOptions` for cache revalidation.
 *  - Read operations (list, getById) do not.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateRiskAssessmentValidationSchema,
  UpdateRiskAssessmentValidationSchema,
  ListRiskAssessmentsValidationSchema,
  GetByIdRiskAssessmentValidationSchema,
  DeleteRiskAssessmentValidationSchema,
} from "./input";

export const CreateRiskAssessmentActionSchema = z.object({
  payload: CreateRiskAssessmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateRiskAssessmentAction = z.infer<
  typeof CreateRiskAssessmentActionSchema
>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListRiskAssessmentsActionSchema = z.object({
  payload: ListRiskAssessmentsValidationSchema.optional(),
});
export type TListRiskAssessmentsAction = z.infer<
  typeof ListRiskAssessmentsActionSchema
>;

export const GetRiskAssessmentByIdActionSchema = z.object({
  payload: GetByIdRiskAssessmentValidationSchema,
});
export type TGetRiskAssessmentByIdAction = z.infer<
  typeof GetRiskAssessmentByIdActionSchema
>;

export const UpdateRiskAssessmentActionSchema = z.object({
  payload: UpdateRiskAssessmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateRiskAssessmentAction = z.infer<
  typeof UpdateRiskAssessmentActionSchema
>;

export const DeleteRiskAssessmentActionSchema = z.object({
  payload: DeleteRiskAssessmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteRiskAssessmentAction = z.infer<
  typeof DeleteRiskAssessmentActionSchema
>;
