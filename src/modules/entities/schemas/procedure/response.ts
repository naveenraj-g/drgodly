/**
 * Procedure response schemas.
 *
 * Layer: entities / schemas / procedure
 *
 * Mirrors the fhir-gql Plain Procedure* response shapes exactly (see
 * fhir-gql/app/schemas/procedure/response.py). All optional fields use
 * .nullish() — the API returns explicit JSON null, not missing keys.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const ProcedureIdentifierResponseSchema = z.object({
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

/** Shared shape for basedOn, partOf, reasonReference, report, complicationDetail, usedReference. */
export const ProcedureReferenceResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

/** Shared shape for reasonCode, bodySite, complication, followUp, usedCode. */
export const ProcedureCodeableConceptResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ProcedurePerformerResponseSchema = z.object({
  id: z.number(),
  function_system: z.string().nullish(),
  function_code: z.string().nullish(),
  function_display: z.string().nullish(),
  function_text: z.string().nullish(),
  actor_type: z.string().nullish(),
  actor_id: z.number().nullish(),
  actor_display: z.string().nullish(),
  on_behalf_of_type: z.string().nullish(),
  on_behalf_of_id: z.number().nullish(),
  on_behalf_of_display: z.string().nullish(),
});

export const ProcedureNoteResponseSchema = z.object({
  id: z.number(),
  text: z.string().nullish(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});

export const ProcedureFocalDeviceResponseSchema = z.object({
  id: z.number(),
  action_system: z.string().nullish(),
  action_code: z.string().nullish(),
  action_display: z.string().nullish(),
  action_text: z.string().nullish(),
  manipulated_reference_type: z.string().nullish(),
  manipulated_reference_id: z.number().nullish(),
  manipulated_reference_display: z.string().nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const ProcedureResponseSchema = z.object({
  id: z.number(),
  status: z.string().nullish(),

  status_reason_system: z.string().nullish(),
  status_reason_code: z.string().nullish(),
  status_reason_display: z.string().nullish(),
  status_reason_text: z.string().nullish(),

  category_system: z.string().nullish(),
  category_code: z.string().nullish(),
  category_display: z.string().nullish(),
  category_text: z.string().nullish(),

  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),

  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  encounter_type: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),

  // performed[x] — exactly one variant is populated per record.
  performed_datetime: z.string().nullish(),
  performed_period_start: z.string().nullish(),
  performed_period_end: z.string().nullish(),
  performed_string: z.string().nullish(),
  performed_age_value: z.number().nullish(),
  performed_age_comparator: z.string().nullish(),
  performed_age_unit: z.string().nullish(),
  performed_age_system: z.string().nullish(),
  performed_age_code: z.string().nullish(),
  performed_range_low_value: z.number().nullish(),
  performed_range_low_unit: z.string().nullish(),
  performed_range_low_system: z.string().nullish(),
  performed_range_low_code: z.string().nullish(),
  performed_range_high_value: z.number().nullish(),
  performed_range_high_unit: z.string().nullish(),
  performed_range_high_system: z.string().nullish(),
  performed_range_high_code: z.string().nullish(),

  recorder_type: z.string().nullish(),
  recorder_id: z.number().nullish(),
  recorder_display: z.string().nullish(),
  asserter_type: z.string().nullish(),
  asserter_id: z.number().nullish(),
  asserter_display: z.string().nullish(),
  location_type: z.string().nullish(),
  location_id: z.number().nullish(),
  location_display: z.string().nullish(),

  outcome_system: z.string().nullish(),
  outcome_code: z.string().nullish(),
  outcome_display: z.string().nullish(),
  outcome_text: z.string().nullish(),

  instantiates_canonical: z.array(z.string()).nullish(),
  instantiates_uri: z.array(z.string()).nullish(),

  identifier: z.array(ProcedureIdentifierResponseSchema).nullish(),
  based_on: z.array(ProcedureReferenceResponseSchema).nullish(),
  part_of: z.array(ProcedureReferenceResponseSchema).nullish(),
  performer: z.array(ProcedurePerformerResponseSchema).nullish(),
  reason_code: z.array(ProcedureCodeableConceptResponseSchema).nullish(),
  reason_reference: z.array(ProcedureReferenceResponseSchema).nullish(),
  body_site: z.array(ProcedureCodeableConceptResponseSchema).nullish(),
  report: z.array(ProcedureReferenceResponseSchema).nullish(),
  complication: z.array(ProcedureCodeableConceptResponseSchema).nullish(),
  complication_detail: z.array(ProcedureReferenceResponseSchema).nullish(),
  follow_up: z.array(ProcedureCodeableConceptResponseSchema).nullish(),
  note: z.array(ProcedureNoteResponseSchema).nullish(),
  focal_device: z.array(ProcedureFocalDeviceResponseSchema).nullish(),
  used_reference: z.array(ProcedureReferenceResponseSchema).nullish(),
  used_code: z.array(ProcedureCodeableConceptResponseSchema).nullish(),

  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TProcedureResponse = z.infer<typeof ProcedureResponseSchema>;

export const PaginatedProcedureResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(ProcedureResponseSchema),
});
export type TPaginatedProcedureResponse = z.infer<typeof PaginatedProcedureResponseSchema>;
