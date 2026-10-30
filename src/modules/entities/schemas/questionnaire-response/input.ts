/**
 * QuestionnaireResponse input validation schemas and DTO types.
 *
 * Layer: entities / schemas / questionnaire-response
 *
 * Mirrors fhir-gql's input Pydantic models (app/schemas/questionnaire_response/input.py):
 * input sub-schemas, create / update / list / getById / delete validation schemas.
 *
 * All coded/enum-shaped fields (status, identifier_use, etc.) are plain `z.string()`.
 * The item/answer tree is recursive and modelled with z.lazy() and explicit
 * TypeScript interfaces.
 */

import { z } from "zod";

// ── Recursive item/answer tree input schemas ──────────────────────────────────

export interface TQuestionnaireResponseAnswerInput {
  value_boolean?: boolean;
  value_decimal?: number;
  value_integer?: number;
  value_date?: string;
  value_datetime?: string;
  value_time?: string;
  value_string?: string;
  value_uri?: string;
  value_coding?: {
    system?: string;
    code?: string;
    display?: string;
  };
  value_quantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  value_reference?: string;
  value_reference_display?: string;
  value_attachment?: {
    content_type?: string;
    language?: string;
    data?: string;
    url?: string;
    size?: number;
    hash?: string;
    title?: string;
    creation?: string;
  };
  item?: TQuestionnaireResponseItemInput[];
}

export interface TQuestionnaireResponseItemInput {
  link_id: string;
  definition?: string;
  text?: string;
  answer?: TQuestionnaireResponseAnswerInput[];
  item?: TQuestionnaireResponseItemInput[];
}

/** Coding datatype for answers. */
export const QuestionnaireResponseAnswerCodingInputSchema = z.object({
  system: z.string().optional(),
  code: z.string().optional(),
  display: z.string().optional(),
});
export type TQuestionnaireResponseAnswerCodingInput = z.infer<
  typeof QuestionnaireResponseAnswerCodingInputSchema
>;

/** Quantity datatype for answers. */
export const QuestionnaireResponseAnswerQuantityInputSchema = z.object({
  value: z.number().optional(),
  unit: z.string().optional(),
  system: z.string().optional(),
  code: z.string().optional(),
});
export type TQuestionnaireResponseAnswerQuantityInput = z.infer<
  typeof QuestionnaireResponseAnswerQuantityInputSchema
>;

/** Attachment datatype for answers. */
export const QuestionnaireResponseAnswerAttachmentInputSchema = z.object({
  content_type: z.string().optional(),
  language: z.string().optional(),
  data: z.string().optional(),
  url: z.string().optional(),
  size: z.number().optional(),
  hash: z.string().optional(),
  title: z.string().optional(),
  creation: z.string().optional(),
});
export type TQuestionnaireResponseAnswerAttachmentInput = z.infer<
  typeof QuestionnaireResponseAnswerAttachmentInputSchema
>;

/** Recursive AnswerInputSchema. */
export const QuestionnaireResponseAnswerInputSchema: z.ZodType<TQuestionnaireResponseAnswerInput> =
  z.lazy(() =>
    z.object({
      value_boolean: z.boolean().optional(),
      value_decimal: z.number().optional(),
      value_integer: z.number().optional(),
      value_date: z.string().optional(),
      value_datetime: z.string().optional(),
      value_time: z.string().optional(),
      value_string: z.string().optional(),
      value_uri: z.string().optional(),
      value_coding: QuestionnaireResponseAnswerCodingInputSchema.optional(),
      value_quantity: QuestionnaireResponseAnswerQuantityInputSchema.optional(),
      value_reference: z.string().optional(),
      value_reference_display: z.string().optional(),
      value_attachment: QuestionnaireResponseAnswerAttachmentInputSchema.optional(),
      item: z.array(QuestionnaireResponseItemInputSchema).optional(),
    }),
  );

/** Recursive ItemInputSchema. */
export const QuestionnaireResponseItemInputSchema: z.ZodType<TQuestionnaireResponseItemInput> =
  z.lazy(() =>
    z.object({
      link_id: z.string().min(1, "Item link_id is required"),
      definition: z.string().optional(),
      text: z.string().optional(),
      answer: z.array(QuestionnaireResponseAnswerInputSchema).optional(),
      item: z.array(QuestionnaireResponseItemInputSchema).optional(),
    }),
  );

/** Reference input for based_on. */
export const QuestionnaireResponseBasedOnInputSchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type TQuestionnaireResponseBasedOnInput = z.infer<
  typeof QuestionnaireResponseBasedOnInputSchema
>;

/** Reference input for part_of. */
export const QuestionnaireResponsePartOfInputSchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type TQuestionnaireResponsePartOfInput = z.infer<
  typeof QuestionnaireResponsePartOfInputSchema
>;

// ── CRUD Validation Schemas ───────────────────────────────────────────────────

/**
 * Validation schema for creating a QuestionnaireResponse.
 * Maps to fhir-gql QuestionnaireResponseCreateSchema.
 */
export const CreateQuestionnaireResponseValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  created_by: z.string().optional(),
  questionnaire: z.string().optional(),
  status: z.string().min(1, "Status is required"),

  identifier_use: z.string().optional(),
  identifier_type_system: z.string().optional(),
  identifier_type_code: z.string().optional(),
  identifier_type_display: z.string().optional(),
  identifier_type_text: z.string().optional(),
  identifier_system: z.string().optional(),
  identifier_value: z.string().optional(),
  identifier_period_start: z.string().optional(),
  identifier_period_end: z.string().optional(),
  identifier_assigner: z.string().optional(),

  based_on: z.array(QuestionnaireResponseBasedOnInputSchema).optional(),
  part_of: z.array(QuestionnaireResponsePartOfInputSchema).optional(),

  subject: z.string().optional(),
  subject_display: z.string().optional(),
  encounter: z.string().optional(),
  encounter_display: z.string().optional(),
  authored: z.string().optional(),
  author: z.string().optional(),
  author_display: z.string().optional(),
  source: z.string().optional(),
  source_display: z.string().optional(),
  item: z.array(QuestionnaireResponseItemInputSchema).optional(),
});
export type TCreateQuestionnaireResponse = z.infer<
  typeof CreateQuestionnaireResponseValidationSchema
>;

/**
 * Base patch schema for QuestionnaireResponse.
 * Maps to fhir-gql QuestionnaireResponsePatchSchema.
 */
const UpdateQuestionnaireResponseBaseSchema = z.object({
  status: z.string().min(1).optional(),
  questionnaire: z.string().optional(),
  authored: z.string().optional(),
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  encounter: z.string().optional(),
  author: z.string().optional(),
  author_display: z.string().optional(),
  source: z.string().optional(),
  source_display: z.string().optional(),
  updated_by: z.string().optional(),

  based_on: z.array(QuestionnaireResponseBasedOnInputSchema).optional(),
  part_of: z.array(QuestionnaireResponsePartOfInputSchema).optional(),
  item: z.array(QuestionnaireResponseItemInputSchema).optional(),
});

/** Dto variant (without id) for service layer. */
export const UpdateQuestionnaireResponseDtoSchema = UpdateQuestionnaireResponseBaseSchema;
export type TUpdateQuestionnaireResponseDto = z.infer<
  typeof UpdateQuestionnaireResponseDtoSchema
>;

/** Full update schema with resource id. */
export const UpdateQuestionnaireResponseValidationSchema =
  UpdateQuestionnaireResponseBaseSchema.extend({
    id: z.number(),
  });
export type TUpdateQuestionnaireResponse = z.infer<
  typeof UpdateQuestionnaireResponseValidationSchema
>;

/**
 * Query schema for listing QuestionnaireResponses.
 * Maps to fhir-gql ListQuestionnaireResponsesSchema.
 */
export const ListQuestionnaireResponsesValidationSchema = z.object({
  org_id: z.string().optional(),
  id: z.string().optional(),
  identifier: z.string().optional(),
  questionnaire: z.string().optional(),
  status: z.string().optional(),
  subject: z.string().optional(),
  patient: z.string().optional(),
  encounter: z.string().optional(),
  author: z.string().optional(),
  source: z.string().optional(),
  based_on: z.string().optional(),
  part_of: z.string().optional(),
  authored: z.union([z.string(), z.array(z.string())]).optional(),
  last_updated: z.union([z.string(), z.array(z.string())]).optional(),
  user_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListQuestionnaireResponsesQuery = z.infer<
  typeof ListQuestionnaireResponsesValidationSchema
>;

/** Schema for fetching by ID. */
export const GetQuestionnaireResponseByIdValidationSchema = z.object({
  id: z.number(),
});
export type TGetQuestionnaireResponseById = z.infer<
  typeof GetQuestionnaireResponseByIdValidationSchema
>;

/** Schema for deleting by ID. */
export const DeleteQuestionnaireResponseValidationSchema = z.object({
  id: z.number(),
});
export type TDeleteQuestionnaireResponse = z.infer<
  typeof DeleteQuestionnaireResponseValidationSchema
>;
