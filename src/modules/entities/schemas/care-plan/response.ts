/**
 * CarePlan response schemas.
 *
 * Layer: entities / schemas / care-plan
 *
 * Mirrors the fhir-gql PlainCarePlan* response shapes exactly (see
 * fhir-gql/app/schemas/care_plan/response.py). All optional fields use
 * .nullish() — the API returns explicit JSON null, not missing keys.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const CarePlanIdentifierResponseSchema = z.object({
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

/** Shared shape for based_on/replaces/part_of/contributors/care_teams/addresses/supporting_info/goals references. */
export const CarePlanRefResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const CarePlanCategoryResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const CarePlanNoteResponseSchema = z.object({
  id: z.number(),
  text: z.string(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});

export const CarePlanActivityOutcomeCCResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const CarePlanActivityOutcomeRefResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const CarePlanActivityProgressResponseSchema = z.object({
  id: z.number(),
  text: z.string(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});

export const CarePlanActivityDetailReasonCodeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const CarePlanActivityDetailReasonRefResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const CarePlanActivityDetailGoalResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const CarePlanActivityDetailPerformerResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

/**
 * One CarePlan.activity entry — either a plain `reference` to another
 * resource, or a fully inlined `detail_*` activity definition (mutually
 * exclusive per FHIR cpl-3), plus its grandchild arrays.
 */
export const CarePlanActivityResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),

  detail_kind: z.string().nullish(),
  detail_instantiates_canonical: z.string().nullish(),
  detail_instantiates_uri: z.string().nullish(),
  detail_code_system: z.string().nullish(),
  detail_code_code: z.string().nullish(),
  detail_code_display: z.string().nullish(),
  detail_code_text: z.string().nullish(),
  detail_status: z.string().nullish(),
  detail_status_reason_system: z.string().nullish(),
  detail_status_reason_code: z.string().nullish(),
  detail_status_reason_display: z.string().nullish(),
  detail_status_reason_text: z.string().nullish(),
  detail_do_not_perform: z.boolean().nullish(),

  detail_scheduled_timing_event: z.string().nullish(),
  detail_scheduled_timing_code_system: z.string().nullish(),
  detail_scheduled_timing_code_code: z.string().nullish(),
  detail_scheduled_timing_code_display: z.string().nullish(),
  detail_scheduled_timing_code_text: z.string().nullish(),
  detail_scheduled_timing_repeat_count: z.number().nullish(),
  detail_scheduled_timing_repeat_count_max: z.number().nullish(),
  detail_scheduled_timing_repeat_duration: z.number().nullish(),
  detail_scheduled_timing_repeat_duration_max: z.number().nullish(),
  detail_scheduled_timing_repeat_duration_unit: z.string().nullish(),
  detail_scheduled_timing_repeat_frequency: z.number().nullish(),
  detail_scheduled_timing_repeat_frequency_max: z.number().nullish(),
  detail_scheduled_timing_repeat_period: z.number().nullish(),
  detail_scheduled_timing_repeat_period_max: z.number().nullish(),
  detail_scheduled_timing_repeat_period_unit: z.string().nullish(),
  detail_scheduled_timing_repeat_day_of_week: z.string().nullish(),
  detail_scheduled_timing_repeat_time_of_day: z.string().nullish(),
  detail_scheduled_timing_repeat_when: z.string().nullish(),
  detail_scheduled_timing_repeat_offset: z.number().nullish(),
  detail_scheduled_timing_repeat_bounds_start: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_end: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_duration_value: z.number().nullish(),
  detail_scheduled_timing_repeat_bounds_duration_comparator: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_duration_unit: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_duration_system: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_duration_code: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_range_low_value: z.number().nullish(),
  detail_scheduled_timing_repeat_bounds_range_low_unit: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_range_low_system: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_range_low_code: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_range_high_value: z.number().nullish(),
  detail_scheduled_timing_repeat_bounds_range_high_unit: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_range_high_system: z.string().nullish(),
  detail_scheduled_timing_repeat_bounds_range_high_code: z.string().nullish(),

  detail_scheduled_period_start: z.string().nullish(),
  detail_scheduled_period_end: z.string().nullish(),
  detail_scheduled_string: z.string().nullish(),

  detail_location_type: z.string().nullish(),
  detail_location_id: z.number().nullish(),
  detail_location_display: z.string().nullish(),

  detail_product_codeable_concept_system: z.string().nullish(),
  detail_product_codeable_concept_code: z.string().nullish(),
  detail_product_codeable_concept_display: z.string().nullish(),
  detail_product_codeable_concept_text: z.string().nullish(),
  detail_product_reference_type: z.string().nullish(),
  detail_product_reference_id: z.number().nullish(),
  detail_product_reference_display: z.string().nullish(),

  detail_daily_amount_value: z.number().nullish(),
  detail_daily_amount_unit: z.string().nullish(),
  detail_daily_amount_system: z.string().nullish(),
  detail_daily_amount_code: z.string().nullish(),

  detail_quantity_value: z.number().nullish(),
  detail_quantity_unit: z.string().nullish(),
  detail_quantity_system: z.string().nullish(),
  detail_quantity_code: z.string().nullish(),

  detail_description: z.string().nullish(),

  outcome_codeable_concepts: z.array(CarePlanActivityOutcomeCCResponseSchema).nullish(),
  outcome_references: z.array(CarePlanActivityOutcomeRefResponseSchema).nullish(),
  progress: z.array(CarePlanActivityProgressResponseSchema).nullish(),
  detail_reason_codes: z.array(CarePlanActivityDetailReasonCodeResponseSchema).nullish(),
  detail_reason_references: z.array(CarePlanActivityDetailReasonRefResponseSchema).nullish(),
  detail_goals: z.array(CarePlanActivityDetailGoalResponseSchema).nullish(),
  detail_performers: z.array(CarePlanActivityDetailPerformerResponseSchema).nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const CarePlanResponseSchema = z.object({
  id: z.number(),
  status: z.string().nullish(),
  intent: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  instantiates_canonical: z.string().nullish(),
  instantiates_uri: z.string().nullish(),
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  encounter_type: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  created: z.string().nullish(),
  author_type: z.string().nullish(),
  author_id: z.number().nullish(),
  author_display: z.string().nullish(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  identifiers: z.array(CarePlanIdentifierResponseSchema).nullish(),
  based_on: z.array(CarePlanRefResponseSchema).nullish(),
  replaces: z.array(CarePlanRefResponseSchema).nullish(),
  part_of: z.array(CarePlanRefResponseSchema).nullish(),
  categories: z.array(CarePlanCategoryResponseSchema).nullish(),
  contributors: z.array(CarePlanRefResponseSchema).nullish(),
  care_teams: z.array(CarePlanRefResponseSchema).nullish(),
  addresses: z.array(CarePlanRefResponseSchema).nullish(),
  supporting_info: z.array(CarePlanRefResponseSchema).nullish(),
  goals: z.array(CarePlanRefResponseSchema).nullish(),
  activities: z.array(CarePlanActivityResponseSchema).nullish(),
  notes: z.array(CarePlanNoteResponseSchema).nullish(),
});
export type TCarePlanResponse = z.infer<typeof CarePlanResponseSchema>;

export const PaginatedCarePlanResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(CarePlanResponseSchema),
});
export type TPaginatedCarePlanResponse = z.infer<typeof PaginatedCarePlanResponseSchema>;
