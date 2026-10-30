/**
 * Questionnaire ZSA action schemas.
 *
 * Layer: entities / schemas / questionnaire
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
  CreateQuestionnaireValidationSchema,
  UpdateQuestionnaireValidationSchema,
  ListQuestionnairesValidationSchema,
  GetQuestionnaireByIdValidationSchema,
  DeleteQuestionnaireValidationSchema,
} from "./input";

export const CreateQuestionnaireActionSchema = z.object({
  payload: CreateQuestionnaireValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateQuestionnaireAction = z.infer<typeof CreateQuestionnaireActionSchema>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListQuestionnairesActionSchema = z.object({
  payload: ListQuestionnairesValidationSchema.optional(),
});
export type TListQuestionnairesAction = z.infer<typeof ListQuestionnairesActionSchema>;

export const GetQuestionnaireByIdActionSchema = z.object({
  payload: GetQuestionnaireByIdValidationSchema,
});
export type TGetQuestionnaireByIdAction = z.infer<typeof GetQuestionnaireByIdActionSchema>;

export const UpdateQuestionnaireActionSchema = z.object({
  payload: UpdateQuestionnaireValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateQuestionnaireAction = z.infer<typeof UpdateQuestionnaireActionSchema>;

export const DeleteQuestionnaireActionSchema = z.object({
  payload: DeleteQuestionnaireValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteQuestionnaireAction = z.infer<typeof DeleteQuestionnaireActionSchema>;
