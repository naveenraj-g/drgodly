/**
 * Task response schemas.
 *
 * Layer: entities / schemas / task
 *
 * Mirrors the fhir-gql PlainTask* response shapes exactly (see
 * fhir-gql/app/schemas/task/response.py — TaskRecord + its child models).
 * All optional fields use .nullish() — the API returns explicit JSON null,
 * not missing keys.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const TaskIdentifierResponseSchema = z.object({
  id: z.number(),
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

/** Shared shape for every plain `{reference_type, reference_id, reference_display}` child row. */
export const TaskReferenceChildResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const TaskPerformerTypeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const TaskNoteResponseSchema = z.object({
  id: z.number(),
  text: z.string(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});

/**
 * Shared shape of Task.input[] and Task.output[] rows — a `type` CodeableConcept
 * (flattened) plus whichever single value[x] variant was supplied. Every variant
 * field is optional here; the backend enforces "exactly one" on write.
 */
export const TaskValueItemResponseSchema = z.object({
  id: z.number(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),

  value_boolean: z.boolean().nullish(),
  value_code: z.string().nullish(),
  value_date: z.string().nullish(),
  value_date_time: z.string().nullish(),
  value_decimal: z.number().nullish(),
  value_integer: z.number().nullish(),
  value_string: z.string().nullish(),
  value_uri: z.string().nullish(),
  value_reference_type: z.string().nullish(),
  value_reference_id: z.number().nullish(),
  value_reference_display: z.string().nullish(),
  value_time: z.string().nullish(),
  value_instant: z.string().nullish(),
  value_markdown: z.string().nullish(),
  value_canonical: z.string().nullish(),
  value_url: z.string().nullish(),
  value_positive_int: z.number().nullish(),
  value_unsigned_int: z.number().nullish(),
  value_base64_binary: z.string().nullish(),
  value_id: z.string().nullish(),

  value_coding_system: z.string().nullish(),
  value_coding_code: z.string().nullish(),
  value_coding_display: z.string().nullish(),

  value_codeable_concept_system: z.string().nullish(),
  value_codeable_concept_code: z.string().nullish(),
  value_codeable_concept_display: z.string().nullish(),
  value_codeable_concept_text: z.string().nullish(),

  value_quantity_value: z.number().nullish(),
  value_quantity_unit: z.string().nullish(),
  value_quantity_system: z.string().nullish(),
  value_quantity_code: z.string().nullish(),

  value_period_start: z.string().nullish(),
  value_period_end: z.string().nullish(),

  value_range_low_value: z.number().nullish(),
  value_range_low_unit: z.string().nullish(),
  value_range_high_value: z.number().nullish(),
  value_range_high_unit: z.string().nullish(),

  value_attachment_content_type: z.string().nullish(),
  value_attachment_language: z.string().nullish(),
  value_attachment_data: z.string().nullish(),
  value_attachment_url: z.string().nullish(),
  value_attachment_size: z.number().nullish(),
  value_attachment_hash: z.string().nullish(),
  value_attachment_title: z.string().nullish(),
  value_attachment_creation: z.string().nullish(),

  value_identifier_use: z.string().nullish(),
  value_identifier_system: z.string().nullish(),
  value_identifier_value: z.string().nullish(),

  value_money_value: z.number().nullish(),
  value_money_currency: z.string().nullish(),

  value_ratio_numerator_value: z.number().nullish(),
  value_ratio_numerator_unit: z.string().nullish(),
  value_ratio_denominator_value: z.number().nullish(),
  value_ratio_denominator_unit: z.string().nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const TaskResponseSchema = z.object({
  id: z.number(),
  status: z.string().nullish(),
  intent: z.string().nullish(),
  priority: z.string().nullish(),
  description: z.string().nullish(),
  instantiates_canonical: z.string().nullish(),
  instantiates_uri: z.string().nullish(),

  group_identifier_use: z.string().nullish(),
  group_identifier_system: z.string().nullish(),
  group_identifier_value: z.string().nullish(),
  group_identifier_type_system: z.string().nullish(),
  group_identifier_type_code: z.string().nullish(),
  group_identifier_type_display: z.string().nullish(),
  group_identifier_type_text: z.string().nullish(),

  status_reason_system: z.string().nullish(),
  status_reason_code: z.string().nullish(),
  status_reason_display: z.string().nullish(),
  status_reason_text: z.string().nullish(),

  business_status_system: z.string().nullish(),
  business_status_code: z.string().nullish(),
  business_status_display: z.string().nullish(),
  business_status_text: z.string().nullish(),

  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),

  focus_type: z.string().nullish(),
  focus_id: z.number().nullish(),
  focus_display: z.string().nullish(),

  for_type: z.string().nullish(),
  for_id: z.number().nullish(),
  for_display: z.string().nullish(),

  encounter_type: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),

  execution_period_start: z.string().nullish(),
  execution_period_end: z.string().nullish(),

  authored_on: z.string().nullish(),
  last_modified: z.string().nullish(),

  requester_type: z.string().nullish(),
  requester_id: z.number().nullish(),
  requester_display: z.string().nullish(),

  owner_type: z.string().nullish(),
  owner_id: z.number().nullish(),
  owner_display: z.string().nullish(),

  location_type: z.string().nullish(),
  location_id: z.number().nullish(),
  location_display: z.string().nullish(),

  reason_code_system: z.string().nullish(),
  reason_code_code: z.string().nullish(),
  reason_code_display: z.string().nullish(),
  reason_code_text: z.string().nullish(),

  reason_reference_type: z.string().nullish(),
  reason_reference_id: z.number().nullish(),
  reason_reference_display: z.string().nullish(),

  restriction_repetitions: z.number().nullish(),
  restriction_period_start: z.string().nullish(),
  restriction_period_end: z.string().nullish(),

  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),

  identifiers: z.array(TaskIdentifierResponseSchema).nullish(),
  based_on: z.array(TaskReferenceChildResponseSchema).nullish(),
  part_of: z.array(TaskReferenceChildResponseSchema).nullish(),
  performer_types: z.array(TaskPerformerTypeResponseSchema).nullish(),
  insurance: z.array(TaskReferenceChildResponseSchema).nullish(),
  notes: z.array(TaskNoteResponseSchema).nullish(),
  relevant_history: z.array(TaskReferenceChildResponseSchema).nullish(),
  restriction_recipients: z.array(TaskReferenceChildResponseSchema).nullish(),
  inputs: z.array(TaskValueItemResponseSchema).nullish(),
  outputs: z.array(TaskValueItemResponseSchema).nullish(),
});
export type TTaskResponse = z.infer<typeof TaskResponseSchema>;

export const PaginatedTaskResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(TaskResponseSchema),
});
export type TPaginatedTaskResponse = z.infer<typeof PaginatedTaskResponseSchema>;
