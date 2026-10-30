/**
 * Questionnaire input validation schemas and DTO types.
 *
 * Layer: entities / schemas / questionnaire
 *
 * Mirrors fhir-gql's input Pydantic models (app/schemas/questionnaire/input.py):
 * input sub-schemas, create / update / list / getById / delete validation
 * schemas.
 *
 * All coded/enum-shaped fields (status, item.type, enable_when.operator,
 * etc.) are plain `z.string()` — never `z.enum([...])`. fhir-gql types these
 * as plain strings validated server-side, not client-enforced enums, so
 * Zod only checks structure here; the R4 item invariants (que-1..que-13,
 * "exactly one value[x]/answer[x] variant", etc.) are enforced by fhir-gql
 * itself and are not re-implemented client-side.
 *
 * Questionnaire.item is a recursive tree — QuestionnaireItemInputSchema uses
 * z.lazy() to reference itself for the nested `item` field.
 */

import { z } from "zod";

// ── Reusable input sub-schemas ─────────────────────────────────────────────────

/** Single FHIR Identifier to attach to a Questionnaire on create. */
export const QuestionnaireIdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string().min(1, "Identifier value is required"),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});
export type TQuestionnaireIdentifierInput = z.infer<typeof QuestionnaireIdentifierInputSchema>;

/** Coding datatype (system | code | display). */
export const QuestionnaireCodingInputSchema = z.object({
  system: z.string().optional(),
  code: z.string().optional(),
  display: z.string().optional(),
});
export type TQuestionnaireCodingInput = z.infer<typeof QuestionnaireCodingInputSchema>;

/** CodeableConcept child entry (one coding + free text) — used for jurisdiction. */
export const QuestionnaireCodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TQuestionnaireCodeableConceptInput = z.infer<
  typeof QuestionnaireCodeableConceptInputSchema
>;

/** ContactPoint within a contact (system, value, use, rank, period). */
export const QuestionnaireContactTelecomInputSchema = z.object({
  system: z.string().optional(),
  value: z.string().optional(),
  use: z.string().optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TQuestionnaireContactTelecomInput = z.infer<
  typeof QuestionnaireContactTelecomInputSchema
>;

/** contact[] — ContactDetail. */
export const QuestionnaireContactInputSchema = z.object({
  name: z.string().optional(),
  telecom: z.array(QuestionnaireContactTelecomInputSchema).optional(),
});
export type TQuestionnaireContactInput = z.infer<typeof QuestionnaireContactInputSchema>;

/** useContext[] — UsageContext: code + one populated value[x] group. */
export const QuestionnaireUseContextInputSchema = z.object({
  code_system: z.string().optional(),
  code_code: z.string().min(1, "code_code is required"),
  code_display: z.string().optional(),
  value_cc_system: z.string().optional(),
  value_cc_code: z.string().optional(),
  value_cc_display: z.string().optional(),
  value_cc_text: z.string().optional(),
  value_quantity_value: z.number().optional(),
  value_quantity_unit: z.string().optional(),
  value_quantity_system: z.string().optional(),
  value_quantity_code: z.string().optional(),
  value_range_low_value: z.number().optional(),
  value_range_low_unit: z.string().optional(),
  value_range_high_value: z.number().optional(),
  value_range_high_unit: z.string().optional(),
  value_reference: z.string().optional(),
  value_reference_display: z.string().optional(),
});
export type TQuestionnaireUseContextInput = z.infer<typeof QuestionnaireUseContextInputSchema>;

// ── item sub-elements ──────────────────────────────────────────────────────────

/** item.enableWhen[] — question, operator and exactly one answer[x] (enforced server-side). */
export const QuestionnaireEnableWhenInputSchema = z.object({
  question: z.string().min(1, "question (linkId) is required"),
  operator: z.string().min(1, "operator is required"),
  answer_boolean: z.boolean().optional(),
  answer_decimal: z.number().optional(),
  answer_integer: z.number().optional(),
  answer_date: z.string().optional(),
  answer_datetime: z.string().optional(),
  answer_time: z.string().optional(),
  answer_string: z.string().optional(),
  answer_coding_system: z.string().optional(),
  answer_coding_code: z.string().optional(),
  answer_coding_display: z.string().optional(),
  answer_quantity_value: z.number().optional(),
  answer_quantity_unit: z.string().optional(),
  answer_quantity_system: z.string().optional(),
  answer_quantity_code: z.string().optional(),
  answer_reference: z.string().optional(),
  answer_reference_display: z.string().optional(),
});
export type TQuestionnaireEnableWhenInput = z.infer<typeof QuestionnaireEnableWhenInputSchema>;

/** item.answerOption[] — exactly one value[x] plus initialSelected (enforced server-side). */
export const QuestionnaireAnswerOptionInputSchema = z.object({
  initial_selected: z.boolean().optional(),
  value_integer: z.number().optional(),
  value_date: z.string().optional(),
  value_time: z.string().optional(),
  value_string: z.string().optional(),
  value_coding_system: z.string().optional(),
  value_coding_code: z.string().optional(),
  value_coding_display: z.string().optional(),
  value_reference: z.string().optional(),
  value_reference_display: z.string().optional(),
});
export type TQuestionnaireAnswerOptionInput = z.infer<typeof QuestionnaireAnswerOptionInputSchema>;

/** item.initial[] — exactly one value[x] (enforced server-side). */
export const QuestionnaireInitialInputSchema = z.object({
  value_boolean: z.boolean().optional(),
  value_decimal: z.number().optional(),
  value_integer: z.number().optional(),
  value_date: z.string().optional(),
  value_datetime: z.string().optional(),
  value_time: z.string().optional(),
  value_string: z.string().optional(),
  value_uri: z.string().optional(),
  value_attachment_content_type: z.string().optional(),
  value_attachment_language: z.string().optional(),
  value_attachment_data: z.string().optional(),
  value_attachment_url: z.string().optional(),
  value_attachment_size: z.number().optional(),
  value_attachment_hash: z.string().optional(),
  value_attachment_title: z.string().optional(),
  value_attachment_creation: z.string().optional(),
  value_coding_system: z.string().optional(),
  value_coding_code: z.string().optional(),
  value_coding_display: z.string().optional(),
  value_quantity_value: z.number().optional(),
  value_quantity_unit: z.string().optional(),
  value_quantity_system: z.string().optional(),
  value_quantity_code: z.string().optional(),
  value_reference: z.string().optional(),
  value_reference_display: z.string().optional(),
});
export type TQuestionnaireInitialInput = z.infer<typeof QuestionnaireInitialInputSchema>;

/**
 * item[] — a question, group or display element; nests recursively via `item`.
 * z.lazy() breaks the circular reference. R4 item invariants (que-1..que-13)
 * are validated by fhir-gql, not re-implemented here.
 */
export type TQuestionnaireItemInput = {
  link_id: string;
  definition?: string;
  code?: TQuestionnaireCodingInput[];
  prefix?: string;
  text?: string;
  type: string;
  enable_when?: TQuestionnaireEnableWhenInput[];
  enable_behavior?: string;
  required?: boolean;
  repeats?: boolean;
  read_only?: boolean;
  max_length?: number;
  answer_value_set?: string;
  answer_option?: TQuestionnaireAnswerOptionInput[];
  initial?: TQuestionnaireInitialInput[];
  item?: TQuestionnaireItemInput[];
};

export const QuestionnaireItemInputSchema: z.ZodType<TQuestionnaireItemInput> = z.lazy(() =>
  z.object({
    link_id: z.string().min(1, "link_id is required"),
    definition: z.string().optional(),
    code: z.array(QuestionnaireCodingInputSchema).optional(),
    prefix: z.string().optional(),
    text: z.string().optional(),
    type: z.string().min(1, "type is required"),
    enable_when: z.array(QuestionnaireEnableWhenInputSchema).optional(),
    enable_behavior: z.string().optional(),
    required: z.boolean().optional(),
    repeats: z.boolean().optional(),
    read_only: z.boolean().optional(),
    max_length: z.number().int().min(0).optional(),
    answer_value_set: z.string().optional(),
    answer_option: z.array(QuestionnaireAnswerOptionInputSchema).optional(),
    initial: z.array(QuestionnaireInitialInputSchema).optional(),
    item: z.array(QuestionnaireItemInputSchema).optional(),
  }),
);

// ── Input validation schemas ───────────────────────────────────────────────────

/**
 * Full schema for creating a Questionnaire. Only `status` is required (R4 1..1).
 * Mirrors fhir-gql's QuestionnaireCreateSchema.
 */
export const CreateQuestionnaireValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  created_by: z.string().optional(),

  url: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  status: z.string().min(1, "status is required"),
  experimental: z.boolean().optional(),
  date: z.string().optional(),
  publisher: z.string().optional(),
  description: z.string().optional(),
  purpose: z.string().optional(),
  copyright: z.string().optional(),
  approval_date: z.string().optional(),
  last_review_date: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),
  derived_from: z.array(z.string()).optional(),

  identifier: z.array(QuestionnaireIdentifierInputSchema).optional(),
  subject_type: z.array(z.string()).optional(),
  contact: z.array(QuestionnaireContactInputSchema).optional(),
  use_context: z.array(QuestionnaireUseContextInputSchema).optional(),
  jurisdiction: z.array(QuestionnaireCodeableConceptInputSchema).optional(),
  code: z.array(QuestionnaireCodingInputSchema).optional(),
  item: z.array(QuestionnaireItemInputSchema).optional(),
});
export type TCreateQuestionnaire = z.infer<typeof CreateQuestionnaireValidationSchema>;

/**
 * Base update fields (no id) — used as the service dto and the foundation for
 * the full validation schema. Child lists and `item` use REPLACE semantics
 * (send `[]` to clear); `status` cannot be nulled. Mirrors
 * fhir-gql's QuestionnairePatchSchema.
 */
const UpdateQuestionnaireBaseSchema = z.object({
  url: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  status: z.string().min(1).optional(),
  experimental: z.boolean().optional(),
  date: z.string().optional(),
  publisher: z.string().optional(),
  description: z.string().optional(),
  purpose: z.string().optional(),
  copyright: z.string().optional(),
  approval_date: z.string().optional(),
  last_review_date: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),
  derived_from: z.array(z.string()).optional(),
  updated_by: z.string().optional(),

  identifier: z.array(QuestionnaireIdentifierInputSchema).optional(),
  subject_type: z.array(z.string()).optional(),
  contact: z.array(QuestionnaireContactInputSchema).optional(),
  use_context: z.array(QuestionnaireUseContextInputSchema).optional(),
  jurisdiction: z.array(QuestionnaireCodeableConceptInputSchema).optional(),
  code: z.array(QuestionnaireCodingInputSchema).optional(),
  item: z.array(QuestionnaireItemInputSchema).optional(),
});

/** Dto variant (no id) — used by the service interface update method. */
export const UpdateQuestionnaireDtoSchema = UpdateQuestionnaireBaseSchema;
export type TUpdateQuestionnaireDto = z.infer<typeof UpdateQuestionnaireDtoSchema>;

/** Full update validation schema — includes id. */
export const UpdateQuestionnaireValidationSchema = UpdateQuestionnaireBaseSchema.extend({
  id: z.number(),
});
export type TUpdateQuestionnaire = z.infer<typeof UpdateQuestionnaireValidationSchema>;

/**
 * Query parameters for listing questionnaires (server-side filtering + pagination).
 * Mirrors fhir-gql's ListQuestionnairesSchema — org_id is mandatory there, but
 * optional here since the server action always stamps it from the session.
 */
export const ListQuestionnairesValidationSchema = z.object({
  org_id: z.string().optional(),
  id: z.string().optional(),
  identifier: z.string().optional(),
  url: z.string().optional(),
  version: z.string().optional(),
  status: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  publisher: z.string().optional(),
  description: z.string().optional(),
  jurisdiction: z.string().optional(),
  code: z.string().optional(),
  subject_type: z.string().optional(),
  user_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListQuestionnairesQuery = z.infer<typeof ListQuestionnairesValidationSchema>;

export const GetQuestionnaireByIdValidationSchema = z.object({ id: z.number() });
export type TGetQuestionnaireById = z.infer<typeof GetQuestionnaireByIdValidationSchema>;

export const DeleteQuestionnaireValidationSchema = z.object({ id: z.number() });
export type TDeleteQuestionnaire = z.infer<typeof DeleteQuestionnaireValidationSchema>;
