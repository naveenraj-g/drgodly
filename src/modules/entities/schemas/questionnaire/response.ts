/**
 * Questionnaire response schemas.
 *
 * Layer: entities / schemas / questionnaire
 *
 * Mirrors fhir-gql's app/schemas/questionnaire/response.py (the Plain*
 * snake_case shapes — `PlainQuestionnaire*` / `QuestionnaireDefinitionResponse`).
 * All optional fields use .nullish() — fhir-gql serialises Python's
 * Optional[X] = None as explicit JSON null, not a missing key.
 *
 * Questionnaire.item is a recursive tree (a question/group/display element
 * that can itself nest further items) — QuestionnaireItemResponseSchema
 * uses z.lazy() to reference itself for the nested `item` field.
 */

import { z } from "zod";

// ── Simple sub-resource rows ───────────────────────────────────────────────────

/** Single FHIR Identifier attached to a Questionnaire. */
export const QuestionnaireIdentifierResponseSchema = z.object({
  id: z.number().nullish(),
  use: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  assigner: z.string().nullish(),
});
export type TQuestionnaireIdentifierResponse = z.infer<
  typeof QuestionnaireIdentifierResponseSchema
>;

/** subjectType child entry — a ResourceType code (e.g. "Patient"). */
export const QuestionnaireSubjectTypeResponseSchema = z.object({
  id: z.number().nullish(),
  code: z.string().nullish(),
});
export type TQuestionnaireSubjectTypeResponse = z.infer<
  typeof QuestionnaireSubjectTypeResponseSchema
>;

/** ContactPoint child entry (contact.telecom). */
export const QuestionnaireTelecomResponseSchema = z.object({
  id: z.number().nullish(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TQuestionnaireTelecomResponse = z.infer<typeof QuestionnaireTelecomResponseSchema>;

/** ContactDetail child entry (contact) with its telecom list. */
export const QuestionnaireContactResponseSchema = z.object({
  id: z.number().nullish(),
  name: z.string().nullish(),
  telecom: z.array(QuestionnaireTelecomResponseSchema).nullish(),
});
export type TQuestionnaireContactResponse = z.infer<typeof QuestionnaireContactResponseSchema>;

/** UsageContext child entry: code + one populated value[x] group. */
export const QuestionnaireUseContextResponseSchema = z.object({
  id: z.number().nullish(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  value_cc_system: z.string().nullish(),
  value_cc_code: z.string().nullish(),
  value_cc_display: z.string().nullish(),
  value_cc_text: z.string().nullish(),
  value_quantity_value: z.number().nullish(),
  value_quantity_unit: z.string().nullish(),
  value_quantity_system: z.string().nullish(),
  value_quantity_code: z.string().nullish(),
  value_range_low_value: z.number().nullish(),
  value_range_low_unit: z.string().nullish(),
  value_range_high_value: z.number().nullish(),
  value_range_high_unit: z.string().nullish(),
  value_reference_type: z.string().nullish(),
  value_reference_id: z.number().nullish(),
  value_reference_display: z.string().nullish(),
});
export type TQuestionnaireUseContextResponse = z.infer<
  typeof QuestionnaireUseContextResponseSchema
>;

/** Jurisdiction CodeableConcept child entry. */
export const QuestionnaireJurisdictionResponseSchema = z.object({
  id: z.number().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TQuestionnaireJurisdictionResponse = z.infer<
  typeof QuestionnaireJurisdictionResponseSchema
>;

/** Coding child entry (Questionnaire.code and item.code). */
export const QuestionnaireCodingResponseSchema = z.object({
  id: z.number().nullish(),
  system: z.string().nullish(),
  code: z.string().nullish(),
  display: z.string().nullish(),
});
export type TQuestionnaireCodingResponse = z.infer<typeof QuestionnaireCodingResponseSchema>;

// ── item sub-elements ──────────────────────────────────────────────────────────

/** item.enableWhen entry: question, operator and one populated answer[x] group. */
export const QuestionnaireEnableWhenResponseSchema = z.object({
  id: z.number().nullish(),
  question: z.string().nullish(),
  operator: z.string().nullish(),
  answer_boolean: z.boolean().nullish(),
  answer_decimal: z.number().nullish(),
  answer_integer: z.number().nullish(),
  answer_date: z.string().nullish(),
  answer_datetime: z.string().nullish(),
  answer_time: z.string().nullish(),
  answer_string: z.string().nullish(),
  answer_coding_system: z.string().nullish(),
  answer_coding_code: z.string().nullish(),
  answer_coding_display: z.string().nullish(),
  answer_quantity_value: z.number().nullish(),
  answer_quantity_unit: z.string().nullish(),
  answer_quantity_system: z.string().nullish(),
  answer_quantity_code: z.string().nullish(),
  answer_reference_type: z.string().nullish(),
  answer_reference_id: z.number().nullish(),
  answer_reference_display: z.string().nullish(),
});
export type TQuestionnaireEnableWhenResponse = z.infer<
  typeof QuestionnaireEnableWhenResponseSchema
>;

/** item.answerOption entry: one populated value[x] group plus initialSelected. */
export const QuestionnaireAnswerOptionResponseSchema = z.object({
  id: z.number().nullish(),
  initial_selected: z.boolean().nullish(),
  value_integer: z.number().nullish(),
  value_date: z.string().nullish(),
  value_time: z.string().nullish(),
  value_string: z.string().nullish(),
  value_coding_system: z.string().nullish(),
  value_coding_code: z.string().nullish(),
  value_coding_display: z.string().nullish(),
  value_reference_type: z.string().nullish(),
  value_reference_id: z.number().nullish(),
  value_reference_display: z.string().nullish(),
});
export type TQuestionnaireAnswerOptionResponse = z.infer<
  typeof QuestionnaireAnswerOptionResponseSchema
>;

/** item.initial entry: one populated value[x] group. */
export const QuestionnaireInitialResponseSchema = z.object({
  id: z.number().nullish(),
  value_boolean: z.boolean().nullish(),
  value_decimal: z.number().nullish(),
  value_integer: z.number().nullish(),
  value_date: z.string().nullish(),
  value_datetime: z.string().nullish(),
  value_time: z.string().nullish(),
  value_string: z.string().nullish(),
  value_uri: z.string().nullish(),
  value_attachment_content_type: z.string().nullish(),
  value_attachment_language: z.string().nullish(),
  value_attachment_data: z.string().nullish(),
  value_attachment_url: z.string().nullish(),
  value_attachment_size: z.number().nullish(),
  value_attachment_hash: z.string().nullish(),
  value_attachment_title: z.string().nullish(),
  value_attachment_creation: z.string().nullish(),
  value_coding_system: z.string().nullish(),
  value_coding_code: z.string().nullish(),
  value_coding_display: z.string().nullish(),
  value_quantity_value: z.number().nullish(),
  value_quantity_unit: z.string().nullish(),
  value_quantity_system: z.string().nullish(),
  value_quantity_code: z.string().nullish(),
  value_reference_type: z.string().nullish(),
  value_reference_id: z.number().nullish(),
  value_reference_display: z.string().nullish(),
});
export type TQuestionnaireInitialResponse = z.infer<typeof QuestionnaireInitialResponseSchema>;

/**
 * item[] — a question, group or display element; nests recursively via `item`.
 * z.lazy() breaks the circular reference TypeScript/Zod would otherwise choke on.
 */
export type TQuestionnaireItemResponse = {
  id?: number | null;
  link_id?: string | null;
  definition?: string | null;
  code?: TQuestionnaireCodingResponse[] | null;
  prefix?: string | null;
  text?: string | null;
  type?: string | null;
  enable_when?: TQuestionnaireEnableWhenResponse[] | null;
  enable_behavior?: string | null;
  required?: boolean | null;
  repeats?: boolean | null;
  read_only?: boolean | null;
  max_length?: number | null;
  answer_value_set?: string | null;
  answer_option?: TQuestionnaireAnswerOptionResponse[] | null;
  initial?: TQuestionnaireInitialResponse[] | null;
  item?: TQuestionnaireItemResponse[] | null;
};

export const QuestionnaireItemResponseSchema: z.ZodType<TQuestionnaireItemResponse> = z.lazy(() =>
  z.object({
    id: z.number().nullish(),
    link_id: z.string().nullish(),
    definition: z.string().nullish(),
    code: z.array(QuestionnaireCodingResponseSchema).nullish(),
    prefix: z.string().nullish(),
    text: z.string().nullish(),
    type: z.string().nullish(),
    enable_when: z.array(QuestionnaireEnableWhenResponseSchema).nullish(),
    enable_behavior: z.string().nullish(),
    required: z.boolean().nullish(),
    repeats: z.boolean().nullish(),
    read_only: z.boolean().nullish(),
    max_length: z.number().nullish(),
    answer_value_set: z.string().nullish(),
    answer_option: z.array(QuestionnaireAnswerOptionResponseSchema).nullish(),
    initial: z.array(QuestionnaireInitialResponseSchema).nullish(),
    item: z.array(QuestionnaireItemResponseSchema).nullish(),
  }),
);

// ── Top-level response ────────────────────────────────────────────────────────

/** Full plain JSON Questionnaire resource (the form definition) returned by fhir-gql. */
export const QuestionnaireResponseSchema = z.object({
  id: z.number(),
  url: z.string().nullish(),
  version: z.string().nullish(),
  name: z.string().nullish(),
  title: z.string().nullish(),
  status: z.string().nullish(),
  experimental: z.boolean().nullish(),
  date: z.string().nullish(),
  publisher: z.string().nullish(),
  description: z.string().nullish(),
  purpose: z.string().nullish(),
  copyright: z.string().nullish(),
  approval_date: z.string().nullish(),
  last_review_date: z.string().nullish(),
  effective_period_start: z.string().nullish(),
  effective_period_end: z.string().nullish(),
  derived_from: z.array(z.string()).nullish(),

  identifier: z.array(QuestionnaireIdentifierResponseSchema).nullish(),
  subject_type: z.array(QuestionnaireSubjectTypeResponseSchema).nullish(),
  contact: z.array(QuestionnaireContactResponseSchema).nullish(),
  use_context: z.array(QuestionnaireUseContextResponseSchema).nullish(),
  jurisdiction: z.array(QuestionnaireJurisdictionResponseSchema).nullish(),
  code: z.array(QuestionnaireCodingResponseSchema).nullish(),
  item: z.array(QuestionnaireItemResponseSchema).nullish(),

  // Tenant / audit fields
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TQuestionnaireResponse = z.infer<typeof QuestionnaireResponseSchema>;

/** Paginated list response — { total, limit, offset, data: TQuestionnaireResponse[] }. */
export const PaginatedQuestionnaireResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(QuestionnaireResponseSchema),
});
export type TPaginatedQuestionnaireResponse = z.infer<
  typeof PaginatedQuestionnaireResponseSchema
>;
