/**
 * CareTeam response schemas.
 *
 * Layer: entities / schemas / care-team
 *
 * Mirrors the fhir-gql PlainCareTeam* response shapes exactly.
 * All optional fields use .nullish() — the API returns explicit JSON null, not missing keys.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const CareTeamIdentifierResponseSchema = z.object({
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

export const CareTeamCodeableConceptResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const CareTeamReferenceResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const CareTeamParticipantResponseSchema = z.object({
  id: z.number(),
  role: z.array(CareTeamCodeableConceptResponseSchema).nullish(),
  member_type: z.string().nullish(),
  member_id: z.number().nullish(),
  member_display: z.string().nullish(),
  on_behalf_of_type: z.string().nullish(),
  on_behalf_of_id: z.number().nullish(),
  on_behalf_of_display: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});

export const CareTeamTelecomResponseSchema = z.object({
  id: z.number(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});

export const CareTeamNoteResponseSchema = z.object({
  id: z.number(),
  text: z.string(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const CareTeamResponseSchema = z.object({
  id: z.number(),
  status: z.string().nullish(),
  name: z.string().nullish(),
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  encounter_type: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  identifier: z.array(CareTeamIdentifierResponseSchema).nullish(),
  category: z.array(CareTeamCodeableConceptResponseSchema).nullish(),
  participant: z.array(CareTeamParticipantResponseSchema).nullish(),
  reason_code: z.array(CareTeamCodeableConceptResponseSchema).nullish(),
  reason_reference: z.array(CareTeamReferenceResponseSchema).nullish(),
  managing_organization: z.array(CareTeamReferenceResponseSchema).nullish(),
  telecom: z.array(CareTeamTelecomResponseSchema).nullish(),
  note: z.array(CareTeamNoteResponseSchema).nullish(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TCareTeamResponse = z.infer<typeof CareTeamResponseSchema>;

export const PaginatedCareTeamResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(CareTeamResponseSchema),
});
export type TPaginatedCareTeamResponse = z.infer<typeof PaginatedCareTeamResponseSchema>;
