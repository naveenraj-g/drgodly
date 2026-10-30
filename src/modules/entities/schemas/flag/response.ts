/**
 * Flag response schemas.
 *
 * Layer: entities / schemas / flag
 *
 * Mirrors the fhir-gql PlainFlag* response shapes exactly (see
 * fhir-gql/app/schemas/flag/response.py). All optional fields use .nullish() —
 * the API returns explicit JSON null, not missing keys. Unlike Condition's
 * identifier/category sub-resources, Flag's PlainFlagIdentifier and
 * PlainFlagCategory both carry their own `id` — mirrored here.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const FlagIdentifierResponseSchema = z.object({
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

export const FlagCategoryResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const FlagResponseSchema = z.object({
  id: z.number(),
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

  period_start: z.string().nullish(),
  period_end: z.string().nullish(),

  encounter_type: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),

  author_type: z.string().nullish(),
  author_id: z.number().nullish(),
  author_display: z.string().nullish(),

  identifier: z.array(FlagIdentifierResponseSchema).nullish(),
  category: z.array(FlagCategoryResponseSchema).nullish(),

  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TFlagResponse = z.infer<typeof FlagResponseSchema>;

export const PaginatedFlagResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(FlagResponseSchema),
});
export type TPaginatedFlagResponse = z.infer<typeof PaginatedFlagResponseSchema>;
