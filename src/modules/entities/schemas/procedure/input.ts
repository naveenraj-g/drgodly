/**
 * Procedure input/validation schemas.
 *
 * Layer: entities / schemas / procedure
 *
 * `status` and `subject` are the only required fields (FHIR R4 cardinality
 * 1..1); everything else is 0..1 or 0..*. Child arrays are REPLACE-semantics
 * on patch — a list that's sent replaces the stored one in full, `[]` clears
 * it, an omitted list is left untouched.
 * URL path: POST/GET/PATCH/DELETE /procedures/
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
  value: z.string(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});

/** Shared shape for basedOn/partOf/reasonReference/report/complicationDetail/usedReference. */
const ReferenceInputSchema = z.object({
  /** FHIR reference e.g. "CarePlan/290001" or "ServiceRequest/80001". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const PerformerInputSchema = z.object({
  function_system: z.string().optional(),
  function_code: z.string().optional(),
  function_display: z.string().optional(),
  function_text: z.string().optional(),
  /** FHIR reference e.g. "Practitioner/30001". */
  actor: z.string(),
  actor_display: z.string().optional(),
  on_behalf_of: z.string().optional(),
  on_behalf_of_display: z.string().optional(),
});

/** Shared shape for reasonCode/bodySite/complication/followUp/usedCode. */
const CodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const NoteInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  /** Mutually exclusive with author_string. */
  author_reference: z.string().optional(),
  author_reference_display: z.string().optional(),
});

const FocalDeviceInputSchema = z.object({
  action_system: z.string().optional(),
  action_code: z.string().optional(),
  action_display: z.string().optional(),
  action_text: z.string().optional(),
  /** FHIR reference e.g. "Device/1". */
  manipulated_reference: z.string(),
  manipulated_reference_display: z.string().optional(),
});

// ── Shared scalar fields (identical on create and patch) ─────────────────────

const ProcedureScalarFieldsSchema = z.object({
  status_reason_system: z.string().optional(),
  status_reason_code: z.string().optional(),
  status_reason_display: z.string().optional(),
  status_reason_text: z.string().optional(),

  category_system: z.string().optional(),
  category_code: z.string().optional(),
  category_display: z.string().optional(),
  category_text: z.string().optional(),

  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),

  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),

  performed_datetime: z.string().optional(),
  performed_period_start: z.string().optional(),
  performed_period_end: z.string().optional(),
  performed_string: z.string().optional(),
  performed_age_value: z.number().optional(),
  /** Age comparator: '<' | '<=' | '>=' | '>'. */
  performed_age_comparator: z.string().optional(),
  performed_age_unit: z.string().optional(),
  performed_age_system: z.string().optional(),
  performed_age_code: z.string().optional(),
  performed_range_low_value: z.number().optional(),
  performed_range_low_unit: z.string().optional(),
  performed_range_low_system: z.string().optional(),
  performed_range_low_code: z.string().optional(),
  performed_range_high_value: z.number().optional(),
  performed_range_high_unit: z.string().optional(),
  performed_range_high_system: z.string().optional(),
  performed_range_high_code: z.string().optional(),

  /** FHIR reference e.g. "Practitioner/30001". */
  recorder: z.string().optional(),
  recorder_display: z.string().optional(),
  /** FHIR reference e.g. "Practitioner/30001". */
  asserter: z.string().optional(),
  asserter_display: z.string().optional(),
  /** FHIR reference e.g. "Location/230001". */
  location: z.string().optional(),
  location_display: z.string().optional(),

  outcome_system: z.string().optional(),
  outcome_code: z.string().optional(),
  outcome_display: z.string().optional(),
  outcome_text: z.string().optional(),

  instantiates_canonical: z.array(z.string()).optional(),
  instantiates_uri: z.array(z.string()).optional(),
});

const ProcedureChildArraysSchema = z.object({
  identifier: z.array(IdentifierInputSchema).optional(),
  based_on: z.array(ReferenceInputSchema).optional(),
  part_of: z.array(ReferenceInputSchema).optional(),
  performer: z.array(PerformerInputSchema).optional(),
  reason_code: z.array(CodeableConceptInputSchema).optional(),
  reason_reference: z.array(ReferenceInputSchema).optional(),
  body_site: z.array(CodeableConceptInputSchema).optional(),
  report: z.array(ReferenceInputSchema).optional(),
  complication: z.array(CodeableConceptInputSchema).optional(),
  complication_detail: z.array(ReferenceInputSchema).optional(),
  follow_up: z.array(CodeableConceptInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
  focal_device: z.array(FocalDeviceInputSchema).optional(),
  used_reference: z.array(ReferenceInputSchema).optional(),
  used_code: z.array(CodeableConceptInputSchema).optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /procedures/.
 * `status` and `subject` are required (FHIR R4 1..1 cardinality).
 */
export const CreateProcedureValidationSchema = ProcedureScalarFieldsSchema.merge(
  ProcedureChildArraysSchema,
).extend({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  /** preparation|in-progress|not-done|on-hold|stopped|completed|entered-in-error|unknown */
  status: z.string(),

  /** FHIR reference e.g. "Patient/10001" or "Group/1". */
  subject: z.string(),
  subject_display: z.string().optional(),
});
export type TCreateProcedure = z.infer<typeof CreateProcedureValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateProcedureBaseSchema = ProcedureScalarFieldsSchema.merge(ProcedureChildArraysSchema).extend({
  status: z.string().optional(),
  subject: z.string().optional(),
  subject_display: z.string().optional(),
});

export const UpdateProcedureDtoSchema = UpdateProcedureBaseSchema;
export type TUpdateProcedureDto = z.infer<typeof UpdateProcedureDtoSchema>;

export const UpdateProcedureValidationSchema = UpdateProcedureBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateProcedure = z.infer<typeof UpdateProcedureValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

/**
 * Curated subset of the FHIR R4 Procedure search params — the ones most
 * useful from the app (full param set: see ListProceduresSchema in fhir-gql).
 * Field names match the fhir-gql query params exactly (passed straight
 * through as axios params, no renaming layer).
 */
export const ListProceduresValidationSchema = z.object({
  /** Token: preparation|in-progress|not-done|on-hold|stopped|completed|entered-in-error|unknown (comma = OR). */
  status: z.string().optional(),
  /** Token `[system|]code` of Procedure.code. */
  code: z.string().optional(),
  /** Subject patient reference: "Patient/10001" or bare "10001". */
  patient: z.string().optional(),
  /** Encounter reference: "Encounter/20001" or bare "20001". */
  encounter: z.string().optional(),
  /** Performer.actor reference e.g. "Practitioner/30001". */
  performer: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListProceduresQuery = z.infer<typeof ListProceduresValidationSchema>;

export const GetByIdProcedureValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdProcedure = z.infer<typeof GetByIdProcedureValidationSchema>;

export const DeleteProcedureValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteProcedure = z.infer<typeof DeleteProcedureValidationSchema>;
