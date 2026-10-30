/**
 * RiskAssessment input/validation schemas.
 *
 * Layer: entities / schemas / risk-assessment
 *
 * `status` and `subject` are required on create (FHIR R4 1..1). All other
 * fields are optional. Child arrays (identifier, reason_code, reason_reference,
 * basis, prediction, note) use REPLACE semantics on patch — send `[]` to clear.
 * URL path: POST/GET/PATCH/DELETE /risk-assessments/
 */

import { z } from "zod";

/** registered|preliminary|final|amended|corrected|cancelled|entered-in-error|unknown */
export const RiskAssessmentStatusSchema = z.enum([
  "registered",
  "preliminary",
  "final",
  "amended",
  "corrected",
  "cancelled",
  "entered-in-error",
  "unknown",
]);
export type TRiskAssessmentStatus = z.infer<typeof RiskAssessmentStatusSchema>;

// ── Child array input schemas ─────────────────────────────────────────────────

const IdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});

const CodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

/** reasonReference — Condition | Observation | DiagnosticReport | DocumentReference. */
const ReasonReferenceInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

/** basis — information used in the assessment, a Reference(Any). */
const BasisInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

/** prediction — an outcome with its likelihood. probability[x] and when[x] are choice types
 *  (decimal OR range; period OR range) — enforced server-side (ras-1/ras-2). */
const PredictionInputSchema = z.object({
  outcome_system: z.string().optional(),
  outcome_code: z.string().optional(),
  outcome_display: z.string().optional(),
  outcome_text: z.string().optional(),
  probability_decimal: z.number().min(0).max(100).optional(),
  probability_range_low_value: z.number().min(0).max(100).optional(),
  probability_range_low_unit: z.string().optional(),
  probability_range_low_system: z.string().optional(),
  /** UCUM code; must be '%' if given (ras-1). */
  probability_range_low_code: z.string().optional(),
  probability_range_high_value: z.number().min(0).max(100).optional(),
  probability_range_high_unit: z.string().optional(),
  probability_range_high_system: z.string().optional(),
  /** UCUM code; must be '%' if given (ras-1). */
  probability_range_high_code: z.string().optional(),
  qualitative_risk_system: z.string().optional(),
  qualitative_risk_code: z.string().optional(),
  qualitative_risk_display: z.string().optional(),
  qualitative_risk_text: z.string().optional(),
  /** Relative likelihood vs. the general population. */
  relative_risk: z.number().optional(),
  when_period_start: z.string().optional(),
  when_period_end: z.string().optional(),
  when_range_low_value: z.number().optional(),
  when_range_low_unit: z.string().optional(),
  when_range_low_system: z.string().optional(),
  when_range_low_code: z.string().optional(),
  when_range_high_value: z.number().optional(),
  when_range_high_unit: z.string().optional(),
  when_range_high_system: z.string().optional(),
  when_range_high_code: z.string().optional(),
  rationale: z.string().optional(),
});

const NoteInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  /** FHIR reference: Practitioner|Patient|RelatedPerson|Organization. Mutually exclusive with author_string. */
  author_reference: z.string().optional(),
  author_reference_display: z.string().optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /risk-assessments/.
 * `status` and `subject` are required; everything else is optional.
 */
export const CreateRiskAssessmentValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  status: RiskAssessmentStatusSchema,

  method_system: z.string().optional(),
  method_code: z.string().optional(),
  method_display: z.string().optional(),
  method_text: z.string().optional(),

  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),

  /** Request fulfilled by this assessment — reference to any resource. */
  based_on: z.string().optional(),
  based_on_display: z.string().optional(),
  /** Part of this occurrence — reference to any resource. */
  parent: z.string().optional(),
  parent_display: z.string().optional(),

  /** FHIR reference e.g. "Patient/10001" or "Group/1". */
  subject: z.string(),
  subject_display: z.string().optional(),

  /** Public encounter_id of the linked Encounter. */
  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),

  /** occurrence[x] — supply datetime OR period, not both. */
  occurrence_datetime: z.string().optional(),
  occurrence_period_start: z.string().optional(),
  occurrence_period_end: z.string().optional(),

  /** FHIR reference e.g. "Condition/120001". */
  condition: z.string().optional(),
  condition_display: z.string().optional(),
  /** FHIR reference: Practitioner|PractitionerRole|Device. */
  performer: z.string().optional(),
  performer_display: z.string().optional(),

  /** How to reduce the risk. */
  mitigation: z.string().optional(),

  identifier: z.array(IdentifierInputSchema).optional(),
  reason_code: z.array(CodeableConceptInputSchema).optional(),
  reason_reference: z.array(ReasonReferenceInputSchema).optional(),
  basis: z.array(BasisInputSchema).optional(),
  prediction: z.array(PredictionInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
});
export type TCreateRiskAssessment = z.infer<typeof CreateRiskAssessmentValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateRiskAssessmentBaseSchema = z.object({
  status: RiskAssessmentStatusSchema.optional(),
  method_system: z.string().optional(),
  method_code: z.string().optional(),
  method_display: z.string().optional(),
  method_text: z.string().optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  based_on: z.string().optional(),
  based_on_display: z.string().optional(),
  parent: z.string().optional(),
  parent_display: z.string().optional(),
  /** Patient|Group reference. */
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  /** Public encounter_id; omit to leave unchanged. */
  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),
  occurrence_datetime: z.string().optional(),
  occurrence_period_start: z.string().optional(),
  occurrence_period_end: z.string().optional(),
  condition: z.string().optional(),
  condition_display: z.string().optional(),
  performer: z.string().optional(),
  performer_display: z.string().optional(),
  mitigation: z.string().optional(),

  // Child lists — REPLACE semantics: a list that is sent replaces the stored one in
  // full; an omitted list is left untouched. Send [] to clear a list.
  identifier: z.array(IdentifierInputSchema).optional(),
  reason_code: z.array(CodeableConceptInputSchema).optional(),
  reason_reference: z.array(ReasonReferenceInputSchema).optional(),
  basis: z.array(BasisInputSchema).optional(),
  prediction: z.array(PredictionInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
});

export const UpdateRiskAssessmentDtoSchema = UpdateRiskAssessmentBaseSchema;
export type TUpdateRiskAssessmentDto = z.infer<typeof UpdateRiskAssessmentDtoSchema>;

export const UpdateRiskAssessmentValidationSchema = UpdateRiskAssessmentBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateRiskAssessment = z.infer<typeof UpdateRiskAssessmentValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListRiskAssessmentsValidationSchema = z.object({
  /** Public risk_assessment_id(s), comma-separated. */
  id: z.string().optional(),
  identifier: z.string().optional(),
  status: z.string().optional(),
  method: z.string().optional(),
  /** Subject reference (Patient or Group). */
  subject: z.string().optional(),
  /** Subject patient reference: "Patient/10001" or "10001". */
  patient: z.string().optional(),
  encounter: z.string().optional(),
  condition: z.string().optional(),
  performer: z.string().optional(),
  /** Occurrence date with optional prefix e.g. "ge2024-01-01". */
  date: z.array(z.string()).optional(),
  /** Prediction probability (number) with optional prefix e.g. "ge20". */
  probability: z.array(z.string()).optional(),
  /** Token of prediction.qualitativeRisk, e.g. "high". */
  risk: z.string().optional(),
  last_updated: z.array(z.string()).optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListRiskAssessmentsQuery = z.infer<typeof ListRiskAssessmentsValidationSchema>;

export const GetByIdRiskAssessmentValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdRiskAssessment = z.infer<typeof GetByIdRiskAssessmentValidationSchema>;

export const DeleteRiskAssessmentValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteRiskAssessment = z.infer<typeof DeleteRiskAssessmentValidationSchema>;
