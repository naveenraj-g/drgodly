/**
 * CarePlan input/validation schemas.
 *
 * Layer: entities / schemas / care-plan
 *
 * Required on create (per FHIR R4 cardinality): status, intent, subject.
 * user_id/org_id are optional here — stamped server-side from the session
 * on every mutating action, never trusted from the client.
 * All child arrays are immutable after creation — delete + re-create to change them.
 * URL path: POST/GET/PATCH/DELETE /care-plans/
 */

import { z } from "zod";

// ── Child array input schemas ─────────────────────────────────────────────────

const IdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});

/** Shared shape for based_on/replaces/part_of/contributors/care_teams/addresses/supporting_info/goals. */
const RefInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

const CategoryInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const NoteInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  author_reference: z.string().optional(),
  author_reference_display: z.string().optional(),
});

const ActivityOutcomeCCInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const ActivityOutcomeRefInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

const ActivityProgressInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  author_reference: z.string().optional(),
  author_reference_display: z.string().optional(),
});

const ActivityDetailReasonCodeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const ActivityDetailReasonRefInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

const ActivityDetailGoalInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

const ActivityDetailPerformerInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

/**
 * One CarePlan.activity entry. Per FHIR cpl-3, supply either `reference`
 * (link to an existing order/request resource) or the `detail_*` fields
 * (an inlined activity definition) — not both. `detail_status` is required
 * whenever any `detail_*` field is supplied.
 */
const ActivityInputSchema = z.object({
  reference: z.string().optional(),
  reference_display: z.string().optional(),

  detail_kind: z.string().optional(),
  detail_instantiates_canonical: z.string().optional(),
  detail_instantiates_uri: z.string().optional(),
  detail_code_system: z.string().optional(),
  detail_code_code: z.string().optional(),
  detail_code_display: z.string().optional(),
  detail_code_text: z.string().optional(),
  detail_status: z.string().optional(),
  detail_status_reason_system: z.string().optional(),
  detail_status_reason_code: z.string().optional(),
  detail_status_reason_display: z.string().optional(),
  detail_status_reason_text: z.string().optional(),
  detail_do_not_perform: z.boolean().optional(),

  detail_scheduled_timing_event: z.string().optional(),
  detail_scheduled_timing_code_system: z.string().optional(),
  detail_scheduled_timing_code_code: z.string().optional(),
  detail_scheduled_timing_code_display: z.string().optional(),
  detail_scheduled_timing_code_text: z.string().optional(),
  detail_scheduled_timing_repeat_count: z.number().int().optional(),
  detail_scheduled_timing_repeat_count_max: z.number().int().optional(),
  detail_scheduled_timing_repeat_duration: z.number().optional(),
  detail_scheduled_timing_repeat_duration_max: z.number().optional(),
  detail_scheduled_timing_repeat_duration_unit: z.string().optional(),
  detail_scheduled_timing_repeat_frequency: z.number().int().optional(),
  detail_scheduled_timing_repeat_frequency_max: z.number().int().optional(),
  detail_scheduled_timing_repeat_period: z.number().optional(),
  detail_scheduled_timing_repeat_period_max: z.number().optional(),
  detail_scheduled_timing_repeat_period_unit: z.string().optional(),
  /** Comma-separated day codes. */
  detail_scheduled_timing_repeat_day_of_week: z.string().optional(),
  /** Comma-separated times. */
  detail_scheduled_timing_repeat_time_of_day: z.string().optional(),
  /** Comma-separated when codes. */
  detail_scheduled_timing_repeat_when: z.string().optional(),
  detail_scheduled_timing_repeat_offset: z.number().int().optional(),
  detail_scheduled_timing_repeat_bounds_start: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_end: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_duration_value: z.number().optional(),
  /** < | <= | >= | > */
  detail_scheduled_timing_repeat_bounds_duration_comparator: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_duration_unit: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_duration_system: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_duration_code: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_range_low_value: z.number().optional(),
  detail_scheduled_timing_repeat_bounds_range_low_unit: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_range_low_system: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_range_low_code: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_range_high_value: z.number().optional(),
  detail_scheduled_timing_repeat_bounds_range_high_unit: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_range_high_system: z.string().optional(),
  detail_scheduled_timing_repeat_bounds_range_high_code: z.string().optional(),

  detail_scheduled_period_start: z.string().optional(),
  detail_scheduled_period_end: z.string().optional(),
  detail_scheduled_string: z.string().optional(),

  detail_location: z.string().optional(),
  detail_location_display: z.string().optional(),

  detail_product_codeable_concept_system: z.string().optional(),
  detail_product_codeable_concept_code: z.string().optional(),
  detail_product_codeable_concept_display: z.string().optional(),
  detail_product_codeable_concept_text: z.string().optional(),
  detail_product_reference: z.string().optional(),
  detail_product_reference_display: z.string().optional(),

  detail_daily_amount_value: z.number().optional(),
  detail_daily_amount_unit: z.string().optional(),
  detail_daily_amount_system: z.string().optional(),
  detail_daily_amount_code: z.string().optional(),

  detail_quantity_value: z.number().optional(),
  detail_quantity_unit: z.string().optional(),
  detail_quantity_system: z.string().optional(),
  detail_quantity_code: z.string().optional(),

  detail_description: z.string().optional(),

  outcome_codeable_concepts: z.array(ActivityOutcomeCCInputSchema).optional(),
  outcome_references: z.array(ActivityOutcomeRefInputSchema).optional(),
  progress: z.array(ActivityProgressInputSchema).optional(),
  detail_reason_codes: z.array(ActivityDetailReasonCodeInputSchema).optional(),
  detail_reason_references: z.array(ActivityDetailReasonRefInputSchema).optional(),
  detail_goals: z.array(ActivityDetailGoalInputSchema).optional(),
  detail_performers: z.array(ActivityDetailPerformerInputSchema).optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /care-plans/.
 * Required: status, intent, subject. Everything else is optional.
 */
export const CreateCarePlanValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  created_by: z.string().optional(),

  /** draft | active | on-hold | revoked | completed | entered-in-error | unknown */
  status: z.string(),
  /** proposal | plan | order | option */
  intent: z.string(),

  /** FHIR reference e.g. "Patient/10001" or "Group/10001". */
  subject: z.string(),
  subject_display: z.string().optional(),

  title: z.string().optional(),
  description: z.string().optional(),
  /** FHIR reference e.g. "Encounter/20001". */
  encounter: z.string().optional(),
  encounter_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  created: z.string().optional(),
  /** FHIR reference, e.g. "Practitioner/30001". */
  author: z.string().optional(),
  author_display: z.string().optional(),
  /** Comma-separated canonical URIs. */
  instantiates_canonical: z.string().optional(),
  /** Comma-separated URIs. */
  instantiates_uri: z.string().optional(),

  identifiers: z.array(IdentifierInputSchema).optional(),
  based_on: z.array(RefInputSchema).optional(),
  replaces: z.array(RefInputSchema).optional(),
  part_of: z.array(RefInputSchema).optional(),
  categories: z.array(CategoryInputSchema).optional(),
  contributors: z.array(RefInputSchema).optional(),
  care_teams: z.array(RefInputSchema).optional(),
  addresses: z.array(RefInputSchema).optional(),
  supporting_info: z.array(RefInputSchema).optional(),
  goals: z.array(RefInputSchema).optional(),
  activities: z.array(ActivityInputSchema).optional(),
  notes: z.array(NoteInputSchema).optional(),
});
export type TCreateCarePlan = z.infer<typeof CreateCarePlanValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateCarePlanBaseSchema = z.object({
  status: z.string().optional(),
  intent: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  encounter: z.string().optional(),
  encounter_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  created: z.string().optional(),
  author: z.string().optional(),
  author_display: z.string().optional(),
  instantiates_canonical: z.string().optional(),
  instantiates_uri: z.string().optional(),

  identifiers: z.array(IdentifierInputSchema).optional(),
  based_on: z.array(RefInputSchema).optional(),
  replaces: z.array(RefInputSchema).optional(),
  part_of: z.array(RefInputSchema).optional(),
  categories: z.array(CategoryInputSchema).optional(),
  contributors: z.array(RefInputSchema).optional(),
  care_teams: z.array(RefInputSchema).optional(),
  addresses: z.array(RefInputSchema).optional(),
  supporting_info: z.array(RefInputSchema).optional(),
  goals: z.array(RefInputSchema).optional(),
  activities: z.array(ActivityInputSchema).optional(),
  notes: z.array(NoteInputSchema).optional(),
});

export const UpdateCarePlanDtoSchema = UpdateCarePlanBaseSchema;
export type TUpdateCarePlanDto = z.infer<typeof UpdateCarePlanDtoSchema>;

export const UpdateCarePlanValidationSchema = UpdateCarePlanBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateCarePlan = z.infer<typeof UpdateCarePlanValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListCarePlansValidationSchema = z.object({
  /** draft | active | on-hold | revoked | completed | entered-in-error | unknown (comma = OR). */
  status: z.string().optional(),
  /** proposal | plan | order | option (comma = OR). */
  intent: z.string().optional(),
  patient_id: z.number().int().optional(),
  encounter_id: z.number().int().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListCarePlansQuery = z.infer<typeof ListCarePlansValidationSchema>;

export const GetByIdCarePlanValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdCarePlan = z.infer<typeof GetByIdCarePlanValidationSchema>;

export const DeleteCarePlanValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteCarePlan = z.infer<typeof DeleteCarePlanValidationSchema>;
