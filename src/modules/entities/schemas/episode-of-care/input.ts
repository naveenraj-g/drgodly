/**
 * EpisodeOfCare input/validation schemas.
 *
 * Layer: entities / schemas / episode-of-care
 *
 * `status` and `patient` are required on create (FHIR R4 1..1). All child
 * arrays (identifiers, status_history, types, diagnoses, referral_requests,
 * team, accounts) use REPLACE semantics on PATCH — fhir-gql clears a list
 * when it's sent as `[]`, leaves it untouched when omitted.
 * URL path: POST/GET/PATCH/DELETE /episode-of-cares/
 */

import { z } from "zod";

/** planned | waitlist | active | onhold | finished | cancelled | entered-in-error */
export const EpisodeOfCareStatusSchema = z.enum([
  "planned",
  "waitlist",
  "active",
  "onhold",
  "finished",
  "cancelled",
  "entered-in-error",
]);
export type TEpisodeOfCareStatus = z.infer<typeof EpisodeOfCareStatusSchema>;

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

const StatusHistoryInputSchema = z.object({
  status: EpisodeOfCareStatusSchema,
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

const TypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const DiagnosisInputSchema = z.object({
  /** FHIR reference, e.g. "Condition/120001". */
  condition: z.string(),
  condition_display: z.string().optional(),
  role_system: z.string().optional(),
  role_code: z.string().optional(),
  role_display: z.string().optional(),
  role_text: z.string().optional(),
  rank: z.number().int().optional(),
});

const ReferralRequestInputSchema = z.object({
  /** FHIR reference, e.g. "ServiceRequest/80001". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const TeamInputSchema = z.object({
  /** FHIR reference, e.g. "CareTeam/1". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const AccountInputSchema = z.object({
  /** FHIR reference, e.g. "Account/1". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /episode-of-cares/.
 * `status` and `patient` are required (FHIR R4 1..1); everything else optional.
 */
export const CreateEpisodeOfCareValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  created_by: z.string().optional(),

  status: EpisodeOfCareStatusSchema,

  /** FHIR reference e.g. "Patient/10001". */
  patient: z.string(),
  patient_display: z.string().optional(),

  /** FHIR reference e.g. "Organization/190001". */
  managing_organization: z.string().optional(),
  managing_organization_display: z.string().optional(),

  period_start: z.string().optional(),
  period_end: z.string().optional(),

  /** Practitioner or PractitionerRole reference, e.g. "Practitioner/30001". */
  care_manager: z.string().optional(),
  care_manager_display: z.string().optional(),

  identifiers: z.array(IdentifierInputSchema).optional(),
  status_history: z.array(StatusHistoryInputSchema).optional(),
  types: z.array(TypeInputSchema).optional(),
  diagnoses: z.array(DiagnosisInputSchema).optional(),
  referral_requests: z.array(ReferralRequestInputSchema).optional(),
  team: z.array(TeamInputSchema).optional(),
  accounts: z.array(AccountInputSchema).optional(),
});
export type TCreateEpisodeOfCare = z.infer<typeof CreateEpisodeOfCareValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateEpisodeOfCareBaseSchema = z.object({
  status: EpisodeOfCareStatusSchema.optional(),

  patient: z.string().optional(),
  patient_display: z.string().optional(),

  managing_organization: z.string().optional(),
  managing_organization_display: z.string().optional(),

  period_start: z.string().optional(),
  period_end: z.string().optional(),

  care_manager: z.string().optional(),
  care_manager_display: z.string().optional(),

  /** REPLACE semantics — sending a list replaces the stored one in full. */
  identifiers: z.array(IdentifierInputSchema).optional(),
  status_history: z.array(StatusHistoryInputSchema).optional(),
  types: z.array(TypeInputSchema).optional(),
  diagnoses: z.array(DiagnosisInputSchema).optional(),
  referral_requests: z.array(ReferralRequestInputSchema).optional(),
  team: z.array(TeamInputSchema).optional(),
  accounts: z.array(AccountInputSchema).optional(),

  updated_by: z.string().optional(),
});

export const UpdateEpisodeOfCareDtoSchema = UpdateEpisodeOfCareBaseSchema;
export type TUpdateEpisodeOfCareDto = z.infer<typeof UpdateEpisodeOfCareDtoSchema>;

export const UpdateEpisodeOfCareValidationSchema = UpdateEpisodeOfCareBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateEpisodeOfCare = z.infer<typeof UpdateEpisodeOfCareValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

/**
 * Search params for GET /episode-of-cares — mirrors the FHIR R4 EpisodeOfCare
 * search params (care_manager, condition, date, identifier, incoming_referral,
 * organization, patient, status, type) plus id and last_updated.
 */
export const ListEpisodeOfCaresValidationSchema = z.object({
  /** _id — public episode_of_care_id(s), comma-separated. */
  id: z.string().optional(),
  /** Token `[system|]value` of EpisodeOfCare.identifier. */
  identifier: z.string().optional(),
  /** Token: planned|waitlist|active|onhold|finished|cancelled|entered-in-error (comma = OR). */
  status: z.string().optional(),
  /** Token `[system|]code` of EpisodeOfCare.type. */
  type: z.string().optional(),
  /** Patient reference: "Patient/10001" or "10001". */
  patient: z.string().optional(),
  /** managingOrganization reference: "Organization/190001" or "190001". */
  organization: z.string().optional(),
  /** careManager reference: Practitioner|PractitionerRole. */
  care_manager: z.string().optional(),
  /** diagnosis.condition reference: "Condition/120001" or "120001". */
  condition: z.string().optional(),
  /** referralRequest reference: "ServiceRequest/80001". */
  incoming_referral: z.string().optional(),
  /** Episode period with optional prefix, e.g. "ge2024-01-01". */
  date: z.array(z.string()).optional(),
  /** _lastUpdated instant with optional prefix. */
  last_updated: z.array(z.string()).optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListEpisodeOfCaresQuery = z.infer<typeof ListEpisodeOfCaresValidationSchema>;

export const GetByIdEpisodeOfCareValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetByIdEpisodeOfCare = z.infer<typeof GetByIdEpisodeOfCareValidationSchema>;

export const DeleteEpisodeOfCareValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TDeleteEpisodeOfCare = z.infer<typeof DeleteEpisodeOfCareValidationSchema>;
