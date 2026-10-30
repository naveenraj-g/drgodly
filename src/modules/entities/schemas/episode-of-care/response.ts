/**
 * EpisodeOfCare response schemas.
 *
 * Layer: entities / schemas / episode-of-care
 *
 * Mirrors the fhir-gql Plain EpisodeOfCare* response shapes exactly.
 * All optional fields use .nullish() — the API returns explicit JSON null, not missing keys.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const EpisodeOfCareIdentifierResponseSchema = z.object({
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

export const EpisodeOfCareStatusHistoryResponseSchema = z.object({
  id: z.number(),
  status: z.string(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});

export const EpisodeOfCareTypeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const EpisodeOfCareDiagnosisResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
  role_system: z.string().nullish(),
  role_code: z.string().nullish(),
  role_display: z.string().nullish(),
  role_text: z.string().nullish(),
  rank: z.number().nullish(),
});

export const EpisodeOfCareReferralRequestResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const EpisodeOfCareTeamResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const EpisodeOfCareAccountResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const EpisodeOfCareResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  status: z.string(),
  patient_type: z.string().nullish(),
  patient_id: z.number().nullish(),
  patient_display: z.string().nullish(),
  managing_organization_type: z.string().nullish(),
  managing_organization_id: z.number().nullish(),
  managing_organization_display: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  care_manager_type: z.string().nullish(),
  care_manager_id: z.number().nullish(),
  care_manager_display: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  identifiers: z.array(EpisodeOfCareIdentifierResponseSchema).nullish(),
  status_history: z.array(EpisodeOfCareStatusHistoryResponseSchema).nullish(),
  types: z.array(EpisodeOfCareTypeResponseSchema).nullish(),
  diagnoses: z.array(EpisodeOfCareDiagnosisResponseSchema).nullish(),
  referral_requests: z.array(EpisodeOfCareReferralRequestResponseSchema).nullish(),
  team: z.array(EpisodeOfCareTeamResponseSchema).nullish(),
  accounts: z.array(EpisodeOfCareAccountResponseSchema).nullish(),
});
export type TEpisodeOfCareResponse = z.infer<typeof EpisodeOfCareResponseSchema>;

export const PaginatedEpisodeOfCareResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(EpisodeOfCareResponseSchema),
});
export type TPaginatedEpisodeOfCareResponse = z.infer<
  typeof PaginatedEpisodeOfCareResponseSchema
>;
