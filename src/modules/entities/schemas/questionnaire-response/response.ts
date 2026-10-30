/**
 * QuestionnaireResponse response schemas.
 *
 * Layer: entities / schemas / questionnaire-response
 *
 * Mirrors the fhir-gql Plain* response shapes exactly (see
 * fhir-gql/app/schemas/questionnaire_response/response.py).
 * All optional fields use .nullish() — the API returns explicit JSON null,
 * not missing keys.
 *
 * The item/answer tree is recursive (an item can carry answers, each answer
 * can itself carry nested items) — modelled with z.lazy() + explicit
 * TypeScript interfaces declared ahead of the schemas, since Zod cannot
 * infer a self-referential type on its own.
 */

import { z } from "zod";

// ── Recursive item/answer tree ────────────────────────────────────────────────

export interface TQuestionnaireResponseAnswer {
  value_type?: string | null;
  value_boolean?: boolean | null;
  value_decimal?: number | null;
  value_integer?: number | null;
  value_date?: string | null;
  value_datetime?: string | null;
  value_time?: string | null;
  value_string?: string | null;
  value_uri?: string | null;
  value_coding?: {
    system?: string | null;
    code?: string | null;
    display?: string | null;
  } | null;
  value_quantity?: {
    value?: number | null;
    unit?: string | null;
    system?: string | null;
    code?: string | null;
  } | null;
  value_reference?: string | null;
  value_reference_display?: string | null;
  value_attachment?: {
    content_type?: string | null;
    language?: string | null;
    data?: string | null;
    url?: string | null;
    size?: number | null;
    hash?: string | null;
    title?: string | null;
    creation?: string | null;
  } | null;
  item?: TQuestionnaireResponseItem[] | null;
}

export interface TQuestionnaireResponseItem {
  link_id: string;
  text?: string | null;
  definition?: string | null;
  answer?: TQuestionnaireResponseAnswer[] | null;
  item?: TQuestionnaireResponseItem[] | null;
}

export const QuestionnaireResponseAnswerResponseSchema: z.ZodType<TQuestionnaireResponseAnswer> =
  z.lazy(() =>
    z.object({
      value_type: z.string().nullish(),
      value_boolean: z.boolean().nullish(),
      value_decimal: z.number().nullish(),
      value_integer: z.number().nullish(),
      value_date: z.string().nullish(),
      value_datetime: z.string().nullish(),
      value_time: z.string().nullish(),
      value_string: z.string().nullish(),
      value_uri: z.string().nullish(),
      value_coding: z
        .object({
          system: z.string().nullish(),
          code: z.string().nullish(),
          display: z.string().nullish(),
        })
        .nullish(),
      value_quantity: z
        .object({
          value: z.number().nullish(),
          unit: z.string().nullish(),
          system: z.string().nullish(),
          code: z.string().nullish(),
        })
        .nullish(),
      value_reference: z.string().nullish(),
      value_reference_display: z.string().nullish(),
      value_attachment: z
        .object({
          content_type: z.string().nullish(),
          language: z.string().nullish(),
          data: z.string().nullish(),
          url: z.string().nullish(),
          size: z.number().nullish(),
          hash: z.string().nullish(),
          title: z.string().nullish(),
          creation: z.string().nullish(),
        })
        .nullish(),
      item: z.array(QuestionnaireResponseItemResponseSchema).nullish(),
    }),
  );

export const QuestionnaireResponseItemResponseSchema: z.ZodType<TQuestionnaireResponseItem> =
  z.lazy(() =>
    z.object({
      link_id: z.string(),
      text: z.string().nullish(),
      definition: z.string().nullish(),
      answer: z.array(QuestionnaireResponseAnswerResponseSchema).nullish(),
      item: z.array(QuestionnaireResponseItemResponseSchema).nullish(),
    }),
  );

// ── basedOn / partOf ────────────────────────────────────────────────────────────

export const QuestionnaireResponseBasedOnResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const QuestionnaireResponsePartOfResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const QuestionnaireResponseResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  questionnaire: z.string().nullish(),
  status: z.string().nullish(),

  identifier_use: z.string().nullish(),
  identifier_type_system: z.string().nullish(),
  identifier_type_code: z.string().nullish(),
  identifier_type_display: z.string().nullish(),
  identifier_type_text: z.string().nullish(),
  identifier_system: z.string().nullish(),
  identifier_value: z.string().nullish(),
  identifier_period_start: z.string().nullish(),
  identifier_period_end: z.string().nullish(),
  identifier_assigner: z.string().nullish(),

  based_on: z.array(QuestionnaireResponseBasedOnResponseSchema).nullish(),
  part_of: z.array(QuestionnaireResponsePartOfResponseSchema).nullish(),

  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  encounter_type: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),
  authored: z.string().nullish(),
  author_type: z.string().nullish(),
  author_id: z.number().nullish(),
  author_display: z.string().nullish(),
  source_type: z.string().nullish(),
  source_id: z.number().nullish(),
  source_display: z.string().nullish(),
  item: z.array(QuestionnaireResponseItemResponseSchema).nullish(),

  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TQuestionnaireResponseResponse = z.infer<
  typeof QuestionnaireResponseResponseSchema
>;

export const PaginatedQuestionnaireResponseResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(QuestionnaireResponseResponseSchema),
});
export type TPaginatedQuestionnaireResponseResponse = z.infer<
  typeof PaginatedQuestionnaireResponseResponseSchema
>;
