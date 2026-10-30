/**
 * Flag input/validation schemas.
 *
 * Layer: entities / schemas / flag
 *
 * Mirrors fhir-gql's FlagCreateSchema / FlagPatchSchema / ListFlagsSchema
 * (fhir-gql/app/schemas/flag/input.py). Flag.code is 1..1 on fhir-gql — a
 * coding or text message must be present — enforced server-side, not
 * re-validated here. Minimum viable create payload: status + subject + one
 * of code_code/code_text. Child arrays (identifier, category) are patchable
 * with REPLACE semantics: send `[]` to clear, omit to leave untouched.
 * URL path: POST/GET/PATCH/DELETE /flags/
 */

import { z } from "zod";

// ── Status enum ───────────────────────────────────────────────────────────────

/** FHIR FlagStatus value set (R4, required binding). */
export const FlagStatusSchema = z.enum(["active", "inactive", "entered-in-error"]);
export type TFlagStatus = z.infer<typeof FlagStatusSchema>;

// ── Child array input schemas ─────────────────────────────────────────────────

const FlagIdentifierInputSchema = z.object({
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

const FlagCategoryInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /flags/.
 * `status` and `subject` are required; code (code_code and/or code_text) is
 * required by fhir-gql but enforced server-side.
 */
export const CreateFlagValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  created_by: z.string().optional(),

  status: FlagStatusSchema,

  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  /** The message shown to the user. */
  code_text: z.string().optional(),

  /** FHIR reference, e.g. "Patient/10001". */
  subject: z.string(),
  subject_display: z.string().optional(),

  period_start: z.string().optional(),
  /** Leave empty while the flag is still active. */
  period_end: z.string().optional(),

  /** Public encounter_id of the linked Encounter. */
  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),

  /** FHIR reference: Device|Organization|Patient|Practitioner|PractitionerRole. */
  author: z.string().optional(),
  author_display: z.string().optional(),

  identifier: z.array(FlagIdentifierInputSchema).optional(),
  category: z.array(FlagCategoryInputSchema).optional(),
});
export type TCreateFlag = z.infer<typeof CreateFlagValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateFlagBaseSchema = z.object({
  status: FlagStatusSchema.optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  /** Public encounter_id; fhir-gql treats null as "unlink" — omit to leave untouched. */
  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),
  author: z.string().optional(),
  author_display: z.string().optional(),
  updated_by: z.string().optional(),

  identifier: z.array(FlagIdentifierInputSchema).optional(),
  category: z.array(FlagCategoryInputSchema).optional(),
});

export const UpdateFlagDtoSchema = UpdateFlagBaseSchema;
export type TUpdateFlagDto = z.infer<typeof UpdateFlagDtoSchema>;

export const UpdateFlagValidationSchema = UpdateFlagBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateFlag = z.infer<typeof UpdateFlagValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

/**
 * Search params for GET /flags — mirrors fhir-gql's ListFlagsSchema.
 * org_id is mandatory on fhir-gql itself, but stays optional here — the
 * server action always stamps it from the session before the call reaches
 * fhir-gql, same convention as every other resource in this app.
 */
export const ListFlagsValidationSchema = z.object({
  /** _id — public flag_id(s), comma-separated. */
  id: z.string().optional(),
  /** Token `[system|]value` of Flag.identifier. */
  identifier: z.string().optional(),
  /** Token: active|inactive|entered-in-error (comma = OR). */
  status: z.string().optional(),
  /** Token `[system|]code` of Flag.category. */
  category: z.string().optional(),
  /** Token `[system|]code` of Flag.code. */
  code: z.string().optional(),
  /** Subject reference (Patient, Location, Group, ...). */
  subject: z.string().optional(),
  /** Subject patient reference: "Patient/10001" or "10001". */
  patient: z.number().int().optional(),
  /** Encounter reference: "Encounter/20001" or "20001". */
  encounter: z.number().int().optional(),
  /** Author reference: Device|Organization|Patient|Practitioner|PractitionerRole. */
  author: z.string().optional(),
  /** Flag active period, optional prefix e.g. "ge2024-01-01". */
  date: z.array(z.string()).optional(),
  /** _lastUpdated instant, optional prefix. */
  last_updated: z.array(z.string()).optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListFlagsQuery = z.infer<typeof ListFlagsValidationSchema>;

export const GetByIdFlagValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdFlag = z.infer<typeof GetByIdFlagValidationSchema>;

export const DeleteFlagValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteFlag = z.infer<typeof DeleteFlagValidationSchema>;
