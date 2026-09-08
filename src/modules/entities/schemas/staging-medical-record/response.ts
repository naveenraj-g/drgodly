/**
 * StagingMedicalRecord response schemas.
 *
 * Layer: entities / schemas / staging-medical-record
 *
 * Mirrors the staging-area service's JSON responses (FHIR_STAGING_SERVER_URL)
 * field-for-field — confirmed against a live sample response, not just the
 * OpenAPI spec. All optional fields use .nullish() — the API returns explicit
 * JSON null, not missing keys.
 *
 * Several observation child arrays (identifier, based_on, part_of, focus,
 * performer, has_member, derived_from, component) are always null on every
 * sample seen so far and nothing in this app reads them yet — modelled as
 * `z.array(z.record(z.string(), z.any()))` (same convention DiagnosticReport's response
 * schema already uses for its own not-yet-typed child arrays) rather than
 * guessed field shapes.
 */
import { z } from "zod";

// ── Observation child schemas (typed — read by the review UI) ─────────────────

export const StagingObservationCategoryResponseSchema = z
  .object({
    id: z.number().nullish(),
    coding_system: z.string().nullish(),
    coding_code: z.string().nullish(),
    coding_display: z.string().nullish(),
    text: z.string().nullish(),
  })
  .passthrough();
export type TStagingObservationCategoryResponse = z.infer<
  typeof StagingObservationCategoryResponseSchema
>;

export const StagingObservationInterpretationResponseSchema =
  StagingObservationCategoryResponseSchema;
export type TStagingObservationInterpretationResponse = z.infer<
  typeof StagingObservationInterpretationResponseSchema
>;

export const StagingObservationNoteResponseSchema = z
  .object({
    id: z.number().nullish(),
    text: z.string().nullish(),
  })
  .passthrough();
export type TStagingObservationNoteResponse = z.infer<
  typeof StagingObservationNoteResponseSchema
>;

export const StagingObservationReferenceRangeResponseSchema = z
  .object({
    id: z.number().nullish(),
    low_value: z.number().nullish(),
    low_unit: z.string().nullish(),
    high_value: z.number().nullish(),
    high_unit: z.string().nullish(),
    text: z.string().nullish(),
  })
  .passthrough();
export type TStagingObservationReferenceRangeResponse = z.infer<
  typeof StagingObservationReferenceRangeResponseSchema
>;

/** value[x] fields — one FHIR Observation may only populate one of these. */
const StagingValueXFields = {
  value_quantity_value: z.number().nullish(),
  value_quantity_comparator: z.string().nullish(),
  value_quantity_unit: z.string().nullish(),
  value_quantity_system: z.string().nullish(),
  value_quantity_code: z.string().nullish(),
  value_codeable_concept_system: z.string().nullish(),
  value_codeable_concept_code: z.string().nullish(),
  value_codeable_concept_display: z.string().nullish(),
  value_codeable_concept_text: z.string().nullish(),
  value_string: z.string().nullish(),
  value_boolean: z.boolean().nullish(),
  value_integer: z.number().nullish(),
  value_time: z.string().nullish(),
  value_date_time: z.string().nullish(),
  value_period_start: z.string().nullish(),
  value_period_end: z.string().nullish(),
  value_range_low_value: z.number().nullish(),
  value_range_low_unit: z.string().nullish(),
  value_range_high_value: z.number().nullish(),
  value_range_high_unit: z.string().nullish(),
  value_ratio_numerator_value: z.number().nullish(),
  value_ratio_numerator_unit: z.string().nullish(),
  value_ratio_denominator_value: z.number().nullish(),
  value_ratio_denominator_unit: z.string().nullish(),
  value_sampled_data_data: z.string().nullish(),
};

// ── Observation (top-level) ────────────────────────────────────────────────────

export const StagingObservationResponseSchema = z
  .object({
    id: z.number(),
    staging_medical_record_id: z.number().nullish(),
    user_id: z.string().nullish(),
    org_id: z.string().nullish(),
    status: z.string().nullish(),
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
    effective_date_time: z.string().nullish(),
    effective_period_start: z.string().nullish(),
    effective_period_end: z.string().nullish(),
    effective_instant: z.string().nullish(),
    issued: z.string().nullish(),
    data_absent_reason_system: z.string().nullish(),
    data_absent_reason_code: z.string().nullish(),
    data_absent_reason_display: z.string().nullish(),
    data_absent_reason_text: z.string().nullish(),
    body_site_system: z.string().nullish(),
    body_site_code: z.string().nullish(),
    body_site_display: z.string().nullish(),
    body_site_text: z.string().nullish(),
    method_system: z.string().nullish(),
    method_code: z.string().nullish(),
    method_display: z.string().nullish(),
    method_text: z.string().nullish(),
    specimen_type: z.string().nullish(),
    specimen_id: z.number().nullish(),
    specimen_display: z.string().nullish(),
    device_type: z.string().nullish(),
    device_id: z.number().nullish(),
    device_display: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    created_by: z.string().nullish(),
    updated_by: z.string().nullish(),
    identifier: z.array(z.record(z.string(), z.any())).nullish(),
    based_on: z.array(z.record(z.string(), z.any())).nullish(),
    part_of: z.array(z.record(z.string(), z.any())).nullish(),
    category: z.array(StagingObservationCategoryResponseSchema).nullish(),
    focus: z.array(z.record(z.string(), z.any())).nullish(),
    performer: z.array(z.record(z.string(), z.any())).nullish(),
    interpretation: z
      .array(StagingObservationInterpretationResponseSchema)
      .nullish(),
    note: z.array(StagingObservationNoteResponseSchema).nullish(),
    reference_range: z
      .array(StagingObservationReferenceRangeResponseSchema)
      .nullish(),
    has_member: z.array(z.record(z.string(), z.any())).nullish(),
    derived_from: z.array(z.record(z.string(), z.any())).nullish(),
    component: z.array(z.record(z.string(), z.any())).nullish(),
    ...StagingValueXFields,
  })
  .passthrough();
export type TStagingObservationResponse = z.infer<
  typeof StagingObservationResponseSchema
>;

// ── Staging medical record (top-level) ─────────────────────────────────────────

export const StagingMedicalRecordResponseSchema = z
  .object({
    id: z.number(),
    attachment_content_type: z.string().nullish(),
    attachment_language: z.string().nullish(),
    attachment_data: z.string().nullish(),
    attachment_url: z.string().nullish(),
    attachment_size: z.number().nullish(),
    attachment_hash: z.string().nullish(),
    attachment_title: z.string().nullish(),
    attachment_creation: z.string().nullish(),
    file_id: z.string().nullish(),
    org_id: z.string().nullish(),
    user_id: z.string().nullish(),
    patient_id: z.number().nullish(),
    appointment_id: z.number().nullish(),
    encounter_id: z.number().nullish(),
    service_request_id: z.number().nullish(),
    diagnostic_report_id: z.number().nullish(),
    /** pending | processing | completed | failed. */
    status: z.string().nullish(),
    error_message: z.string().nullish(),
    processed_at: z.string().nullish(),
    /** Agent-written plain-language summary of the document. */
    summary: z.string().nullish(),
    /** accepted | rejected | needs_revision | pending_review. */
    review_status: z.string().nullish(),
    reviewed_by: z.string().nullish(),
    reviewed_at: z.string().nullish(),
    review_notes: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    created_by: z.string().nullish(),
    updated_by: z.string().nullish(),
    observations: z.array(StagingObservationResponseSchema).nullish(),
  })
  .passthrough();
export type TStagingMedicalRecordResponse = z.infer<
  typeof StagingMedicalRecordResponseSchema
>;

export const PaginatedStagingMedicalRecordResponseSchema = z.object({
  total: z.number().nullish(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(StagingMedicalRecordResponseSchema),
});
export type TPaginatedStagingMedicalRecordResponse = z.infer<
  typeof PaginatedStagingMedicalRecordResponseSchema
>;
