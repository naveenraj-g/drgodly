/**
 * RiskAssessment response schemas.
 *
 * Layer: entities / schemas / risk-assessment
 *
 * Mirrors the fhir-gql PlainRiskAssessment* response shapes exactly.
 * All optional fields use .nullish() — the API returns explicit JSON null, not missing keys.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const RiskAssessmentIdentifierResponseSchema = z.object({
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

export const RiskAssessmentCodeableConceptResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

/** Generic reference child entry — shared shape for reason_reference and basis. */
export const RiskAssessmentReferenceResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const RiskAssessmentPredictionResponseSchema = z.object({
  id: z.number(),
  outcome_system: z.string().nullish(),
  outcome_code: z.string().nullish(),
  outcome_display: z.string().nullish(),
  outcome_text: z.string().nullish(),
  probability_decimal: z.number().nullish(),
  probability_range_low_value: z.number().nullish(),
  probability_range_low_unit: z.string().nullish(),
  probability_range_low_system: z.string().nullish(),
  probability_range_low_code: z.string().nullish(),
  probability_range_high_value: z.number().nullish(),
  probability_range_high_unit: z.string().nullish(),
  probability_range_high_system: z.string().nullish(),
  probability_range_high_code: z.string().nullish(),
  qualitative_risk_system: z.string().nullish(),
  qualitative_risk_code: z.string().nullish(),
  qualitative_risk_display: z.string().nullish(),
  qualitative_risk_text: z.string().nullish(),
  relative_risk: z.number().nullish(),
  when_period_start: z.string().nullish(),
  when_period_end: z.string().nullish(),
  when_range_low_value: z.number().nullish(),
  when_range_low_unit: z.string().nullish(),
  when_range_low_system: z.string().nullish(),
  when_range_low_code: z.string().nullish(),
  when_range_high_value: z.number().nullish(),
  when_range_high_unit: z.string().nullish(),
  when_range_high_system: z.string().nullish(),
  when_range_high_code: z.string().nullish(),
  rationale: z.string().nullish(),
});

export const RiskAssessmentNoteResponseSchema = z.object({
  id: z.number(),
  text: z.string().nullish(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const RiskAssessmentResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  status: z.string().nullish(),
  method_system: z.string().nullish(),
  method_code: z.string().nullish(),
  method_display: z.string().nullish(),
  method_text: z.string().nullish(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  based_on_type: z.string().nullish(),
  based_on_id: z.number().nullish(),
  based_on_display: z.string().nullish(),
  parent_type: z.string().nullish(),
  parent_id: z.number().nullish(),
  parent_display: z.string().nullish(),
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  encounter_type: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),
  occurrence_datetime: z.string().nullish(),
  occurrence_period_start: z.string().nullish(),
  occurrence_period_end: z.string().nullish(),
  condition_type: z.string().nullish(),
  condition_id: z.number().nullish(),
  condition_display: z.string().nullish(),
  performer_type: z.string().nullish(),
  performer_id: z.number().nullish(),
  performer_display: z.string().nullish(),
  mitigation: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  identifier: z.array(RiskAssessmentIdentifierResponseSchema).nullish(),
  reason_code: z.array(RiskAssessmentCodeableConceptResponseSchema).nullish(),
  reason_reference: z.array(RiskAssessmentReferenceResponseSchema).nullish(),
  basis: z.array(RiskAssessmentReferenceResponseSchema).nullish(),
  prediction: z.array(RiskAssessmentPredictionResponseSchema).nullish(),
  note: z.array(RiskAssessmentNoteResponseSchema).nullish(),
});
export type TRiskAssessmentResponse = z.infer<typeof RiskAssessmentResponseSchema>;

export const PaginatedRiskAssessmentResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(RiskAssessmentResponseSchema),
});
export type TPaginatedRiskAssessmentResponse = z.infer<
  typeof PaginatedRiskAssessmentResponseSchema
>;
