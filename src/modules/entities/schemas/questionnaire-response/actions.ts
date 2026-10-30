/**
 * QuestionnaireResponse ZSA action schemas.
 *
 * Layer: entities / schemas / questionnaire-response
 *
 * Wraps every input validation schema in the ZSA action envelope:
 *  - Mutating operations include `transportOptions` for cache revalidation.
 *  - Read operations (list, getById) do not.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateQuestionnaireResponseValidationSchema,
  UpdateQuestionnaireResponseValidationSchema,
  ListQuestionnaireResponsesValidationSchema,
  GetQuestionnaireResponseByIdValidationSchema,
  DeleteQuestionnaireResponseValidationSchema,
} from "./input";

export const CreateQuestionnaireResponseActionSchema = z.object({
  payload: CreateQuestionnaireResponseValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateQuestionnaireResponseAction = z.infer<
  typeof CreateQuestionnaireResponseActionSchema
>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListQuestionnaireResponsesActionSchema = z.object({
  payload: ListQuestionnaireResponsesValidationSchema.optional(),
});
export type TListQuestionnaireResponsesAction = z.infer<
  typeof ListQuestionnaireResponsesActionSchema
>;

export const GetQuestionnaireResponseByIdActionSchema = z.object({
  payload: GetQuestionnaireResponseByIdValidationSchema,
});
export type TGetQuestionnaireResponseByIdAction = z.infer<
  typeof GetQuestionnaireResponseByIdActionSchema
>;

export const UpdateQuestionnaireResponseActionSchema = z.object({
  payload: UpdateQuestionnaireResponseValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateQuestionnaireResponseAction = z.infer<
  typeof UpdateQuestionnaireResponseActionSchema
>;

export const DeleteQuestionnaireResponseActionSchema = z.object({
  payload: DeleteQuestionnaireResponseValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteQuestionnaireResponseAction = z.infer<
  typeof DeleteQuestionnaireResponseActionSchema
>;
