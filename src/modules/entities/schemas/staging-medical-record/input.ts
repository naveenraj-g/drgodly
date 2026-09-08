/**
 * StagingMedicalRecord input/validation schemas.
 *
 * Layer: entities / schemas / staging-medical-record
 *
 * URL path: POST/GET/PATCH/DELETE {FHIR_STAGING_SERVER_URL}/ (already includes
 * /api/v1/staging-records — the module's Axios client uses it as the base URL
 * directly, no extra path segment).
 *
 * This service does not authenticate — org_id/user_id are forwarded fields,
 * trusted as given, per the source OpenAPI spec.
 *
 * The `review` endpoint is deliberately a separate schema/action from `patch`:
 * the agent pipeline and a doctor reviewing the result are two different
 * callers writing two different kinds of fact, and the source service keeps
 * them on separate routes so one cannot accidentally overwrite the other.
 */
import { z } from "zod";

// ── Nested observation input (fields this app actually writes) ────────────────
// The source schema also carries a large effective_timing_repeat_* block for
// FHIR Observation's recurring-schedule shape — omitted here since staging
// observations are always point-in-time extracted results, never schedules.

const StagingObservationCategoryInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const StagingObservationNoteInputSchema = z.object({
  text: z.string(),
});

const StagingObservationReferenceRangeInputSchema = z.object({
  low_value: z.number().optional(),
  low_unit: z.string().optional(),
  high_value: z.number().optional(),
  high_unit: z.string().optional(),
  text: z.string().optional(),
});

export const StagingObservationInputSchema = z.object({
  status: z.string().optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  /** FHIR reference e.g. 'Patient/10001'. */
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),
  effective_date_time: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),
  effective_instant: z.string().optional(),
  issued: z.string().optional(),
  category: z.array(StagingObservationCategoryInputSchema).optional(),
  interpretation: z.array(StagingObservationCategoryInputSchema).optional(),
  note: z.array(StagingObservationNoteInputSchema).optional(),
  reference_range: z
    .array(StagingObservationReferenceRangeInputSchema)
    .optional(),
  value_quantity_value: z.number().optional(),
  value_quantity_unit: z.string().optional(),
  value_quantity_system: z.string().optional(),
  value_quantity_code: z.string().optional(),
  value_codeable_concept_display: z.string().optional(),
  value_codeable_concept_text: z.string().optional(),
  value_string: z.string().optional(),
  value_boolean: z.boolean().optional(),
  value_integer: z.number().optional(),
  value_date_time: z.string().optional(),
});
export type TStagingObservationInput = z.infer<
  typeof StagingObservationInputSchema
>;

// ── Create schema ─────────────────────────────────────────────────────────────

export const CreateStagingMedicalRecordValidationSchema = z.object({
  attachment_content_type: z.string().optional(),
  attachment_language: z.string().optional(),
  attachment_data: z.string().optional(),
  attachment_url: z.string().optional(),
  attachment_size: z.number().int().min(0).optional(),
  attachment_hash: z.string().optional(),
  attachment_title: z.string().optional(),
  attachment_creation: z.string().optional(),
  /** filenest's opaque id for the file. */
  file_id: z.string().optional(),
  org_id: z.string().optional(),
  user_id: z.string().optional(),
  patient_id: z.number().int().optional(),
  appointment_id: z.number().int().optional(),
  encounter_id: z.number().int().optional(),
  /** The order this medical record was produced against. */
  service_request_id: z.number().int().optional(),
  diagnostic_report_id: z.number().int().optional(),
  /** Defaults to 'pending' on the server when omitted — puts it on the agent's queue. */
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  error_message: z.string().optional(),
  processed_at: z.string().optional(),
  summary: z.string().optional(),
  created_by: z.string().optional(),
  observations: z.array(StagingObservationInputSchema).optional(),
});
export type TCreateStagingMedicalRecord = z.infer<
  typeof CreateStagingMedicalRecordValidationSchema
>;

// ── Patch schema ───────────────────────────────────────────────────────────────
// Partial update — only fields present in the body are applied. `observations`
// REPLACES the full list when present at all (omit the key to leave untouched).

const UpdateStagingMedicalRecordBaseSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  error_message: z.string().optional(),
  processed_at: z.string().optional(),
  summary: z.string().optional(),
  updated_by: z.string().optional(),
  observations: z.array(StagingObservationInputSchema).optional(),
});
export const UpdateStagingMedicalRecordDtoSchema =
  UpdateStagingMedicalRecordBaseSchema;
export type TUpdateStagingMedicalRecordDto = z.infer<
  typeof UpdateStagingMedicalRecordDtoSchema
>;

export const UpdateStagingMedicalRecordValidationSchema =
  UpdateStagingMedicalRecordBaseSchema.extend({
    id: z.number().int().positive(),
  });
export type TUpdateStagingMedicalRecord = z.infer<
  typeof UpdateStagingMedicalRecordValidationSchema
>;

// ── Review schema ────────────────────────────────────────────────────────────

const ReviewStagingMedicalRecordBaseSchema = z.object({
  review_status: z.enum([
    "accepted",
    "rejected",
    "needs_revision",
    "pending_review",
  ]),
  reviewed_by: z.string().optional(),
  review_notes: z.string().optional(),
});
export const ReviewStagingMedicalRecordDtoSchema =
  ReviewStagingMedicalRecordBaseSchema;
export type TReviewStagingMedicalRecordDto = z.infer<
  typeof ReviewStagingMedicalRecordDtoSchema
>;

export const ReviewStagingMedicalRecordValidationSchema =
  ReviewStagingMedicalRecordBaseSchema.extend({
    id: z.number().int().positive(),
  });
export type TReviewStagingMedicalRecord = z.infer<
  typeof ReviewStagingMedicalRecordValidationSchema
>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListStagingMedicalRecordsValidationSchema = z.object({
  org_id: z.string().optional(),
  user_id: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  /** Exact match on filenest's file id. */
  file_id: z.string().optional(),
  patient_id: z.number().int().min(1).optional(),
  appointment_id: z.number().int().min(1).optional(),
  encounter_id: z.number().int().min(1).optional(),
  service_request_id: z.number().int().min(1).optional(),
  diagnostic_report_id: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListStagingMedicalRecordsQuery = z.infer<
  typeof ListStagingMedicalRecordsValidationSchema
>;

export const GetByIdStagingMedicalRecordValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetByIdStagingMedicalRecord = z.infer<
  typeof GetByIdStagingMedicalRecordValidationSchema
>;

export const DeleteStagingMedicalRecordValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TDeleteStagingMedicalRecord = z.infer<
  typeof DeleteStagingMedicalRecordValidationSchema
>;
