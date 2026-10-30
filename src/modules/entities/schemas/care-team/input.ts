/**
 * CareTeam input/validation schemas.
 *
 * Layer: entities / schemas / care-team
 *
 * No fields are required on create (status is 0..1 per FHIR R4). References
 * (subject, encounter, participant.member, participant.on_behalf_of,
 * reason_reference, managing_organization) are "Type/id" strings — existence
 * is never validated here, only format (left to fhir-gql).
 *
 * Unlike Condition, CareTeam's PATCH genuinely supports replacing the child
 * arrays (identifier/category/participant/reason_code/reason_reference/
 * managing_organization/telecom/note) and the subject/encounter/period
 * fields — mirrored from the real fhir-gql CareTeamPatchSchema rather than
 * assuming the narrower "arrays are immutable" convention other resources
 * in this app follow.
 *
 * URL path: POST/GET/PATCH/DELETE /care-teams/
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

const CodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const ReferenceInputSchema = z.object({
  /** FHIR reference e.g. "Condition/120001" or "Organization/190001". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const ParticipantInputSchema = z.object({
  role: z.array(CodeableConceptInputSchema).optional(),
  /** Practitioner|PractitionerRole|RelatedPerson|Patient|Organization|CareTeam reference. */
  member: z.string().optional(),
  member_display: z.string().optional(),
  /** Organization reference — only valid when member is a Practitioner (ctm-1). */
  on_behalf_of: z.string().optional(),
  on_behalf_of_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

const TelecomInputSchema = z.object({
  system: z.enum(["phone", "fax", "email", "pager", "url", "sms", "other"]).optional(),
  value: z.string().optional(),
  use: z.enum(["home", "work", "temp", "old", "mobile"]).optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

const NoteInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  author_reference: z.string().optional(),
  author_reference_display: z.string().optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /care-teams/.
 * All fields optional — proposed|active|suspended|inactive|entered-in-error for status.
 */
export const CreateCareTeamValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  status: z.string().optional(),
  name: z.string().optional(),

  /** FHIR reference e.g. "Patient/10001" — who the care team is for. */
  subject: z.string().optional(),
  subject_display: z.string().optional(),

  /** FHIR reference e.g. "Encounter/20001". */
  encounter: z.string().optional(),
  encounter_display: z.string().optional(),

  period_start: z.string().optional(),
  period_end: z.string().optional(),

  identifier: z.array(IdentifierInputSchema).optional(),
  category: z.array(CodeableConceptInputSchema).optional(),
  participant: z.array(ParticipantInputSchema).optional(),
  reason_code: z.array(CodeableConceptInputSchema).optional(),
  /** Condition references. */
  reason_reference: z.array(ReferenceInputSchema).optional(),
  /** Organization references. */
  managing_organization: z.array(ReferenceInputSchema).optional(),
  telecom: z.array(TelecomInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
});
export type TCreateCareTeam = z.infer<typeof CreateCareTeamValidationSchema>;

// ── Update (patch) schema ─────────────────────────────────────────────────────

const UpdateCareTeamBaseSchema = z.object({
  status: z.string().optional(),
  name: z.string().optional(),
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  encounter: z.string().optional(),
  encounter_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  updated_by: z.string().optional(),

  /** Replace semantics — a sent list replaces the stored one in full; [] clears it; omitted leaves it untouched. */
  identifier: z.array(IdentifierInputSchema).optional(),
  category: z.array(CodeableConceptInputSchema).optional(),
  participant: z.array(ParticipantInputSchema).optional(),
  reason_code: z.array(CodeableConceptInputSchema).optional(),
  reason_reference: z.array(ReferenceInputSchema).optional(),
  managing_organization: z.array(ReferenceInputSchema).optional(),
  telecom: z.array(TelecomInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
});

export const UpdateCareTeamDtoSchema = UpdateCareTeamBaseSchema;
export type TUpdateCareTeamDto = z.infer<typeof UpdateCareTeamDtoSchema>;

export const UpdateCareTeamValidationSchema = UpdateCareTeamBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateCareTeam = z.infer<typeof UpdateCareTeamValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListCareTeamsValidationSchema = z.object({
  identifier: z.string().optional(),
  /** Token: proposed|active|suspended|inactive|entered-in-error, comma = OR. */
  status: z.string().optional(),
  category: z.string().optional(),
  /** Subject reference (Patient|Group) — "Patient/10001" or bare "10001". */
  subject: z.string().optional(),
  /** Subject patient reference — "Patient/10001" or bare "10001". */
  patient: z.string().optional(),
  /** Encounter reference — "Encounter/20001" or bare "20001". */
  encounter: z.string().optional(),
  /** participant.member reference (Practitioner|PractitionerRole|RelatedPerson|Patient|Organization|CareTeam). */
  participant: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListCareTeamsQuery = z.infer<typeof ListCareTeamsValidationSchema>;

export const GetByIdCareTeamValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdCareTeam = z.infer<typeof GetByIdCareTeamValidationSchema>;

export const DeleteCareTeamValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteCareTeam = z.infer<typeof DeleteCareTeamValidationSchema>;
