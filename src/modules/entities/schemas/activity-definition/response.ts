/**
 * ActivityDefinition response schemas.
 *
 * Layer: entities / schemas / activity-definition
 *
 * Mirrors fhir-gql's app/schemas/activity_definition/response.py. All
 * optional fields use .nullish() — the fhir-gql API serialises Python's
 * Optional[X] = None as explicit JSON null, not as a missing key.
 *
 * ActivityDefinition is deeply nested and choice-typed (timing[x], dosage,
 * participant, dynamic_value, ...). fhir-gql's own response model forwards
 * most of these sub-structures as untyped `Dict[str, Any]` / `List[Dict]`
 * rather than fully-typed Pydantic sub-models (unlike HealthcareService) —
 * this schema follows the same shape: generic `z.record`/`z.array(z.record)`
 * for those fields, typed sub-objects only where fhir-gql itself types them
 * (jurisdiction/topic/body_site CodeableConcepts, the two *Requirement
 * reference arrays).
 */

import { z } from "zod";

/** Shared shape for jurisdiction/topic/body_site — fhir-gql's only typed CodeableConcept rows here. */
export const ActivityDefinitionCodeableConceptResponseSchema = z.object({
  id: z.number().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TActivityDefinitionCodeableConceptResponse = z.infer<
  typeof ActivityDefinitionCodeableConceptResponseSchema
>;

/** A flattened reference row (specimen/observation/observation-result requirement). */
export const ActivityDefinitionReferenceResponseSchema = z.object({
  id: z.number().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TActivityDefinitionReferenceResponse = z.infer<
  typeof ActivityDefinitionReferenceResponseSchema
>;

/** Full ActivityDefinition resource returned by the fhir-gql API. */
export const ActivityDefinitionResponseSchema = z.object({
  id: z.number(),
  url: z.string().nullish(),
  version: z.string().nullish(),
  name: z.string().nullish(),
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
  status: z.string().nullish(),
  experimental: z.boolean().nullish(),
  date: z.string().nullish(),
  publisher: z.string().nullish(),
  description: z.string().nullish(),
  purpose: z.string().nullish(),
  usage: z.string().nullish(),
  copyright: z.string().nullish(),
  approval_date: z.string().nullish(),
  last_review_date: z.string().nullish(),
  effective_period_start: z.string().nullish(),
  effective_period_end: z.string().nullish(),

  // subject[x] — flattened CodeableConcept, or a Group reference
  subject_cc_system: z.string().nullish(),
  subject_cc_code: z.string().nullish(),
  subject_cc_display: z.string().nullish(),
  subject_cc_text: z.string().nullish(),
  subject_reference_type: z.string().nullish(),
  subject_reference_id: z.number().nullish(),
  subject_reference_display: z.string().nullish(),

  kind: z.string().nullish(),
  profile: z.string().nullish(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  intent: z.string().nullish(),
  priority: z.string().nullish(),
  do_not_perform: z.boolean().nullish(),

  // timing[x] — one of these is set per FHIR's choice-type rule
  timing_datetime: z.string().nullish(),
  timing_age: z.record(z.string(), z.unknown()).nullish(),
  timing_period: z.record(z.string(), z.unknown()).nullish(),
  timing_range: z.record(z.string(), z.unknown()).nullish(),
  timing_duration: z.record(z.string(), z.unknown()).nullish(),
  timing_timing: z.record(z.string(), z.unknown()).nullish(),

  location_type: z.string().nullish(),
  location_id: z.number().nullish(),
  location_display: z.string().nullish(),

  // product[x] — Reference or CodeableConcept
  product_reference_type: z.string().nullish(),
  product_reference_id: z.number().nullish(),
  product_reference_display: z.string().nullish(),
  product_cc_system: z.string().nullish(),
  product_cc_code: z.string().nullish(),
  product_cc_display: z.string().nullish(),
  product_cc_text: z.string().nullish(),

  quantity: z.record(z.string(), z.unknown()).nullish(),
  transform: z.string().nullish(),

  // Sub-resource arrays — untyped passthrough, matching fhir-gql's own response shape
  identifier: z.array(z.record(z.string(), z.unknown())).nullish(),
  contact: z.array(z.record(z.string(), z.unknown())).nullish(),
  author: z.array(z.record(z.string(), z.unknown())).nullish(),
  editor: z.array(z.record(z.string(), z.unknown())).nullish(),
  reviewer: z.array(z.record(z.string(), z.unknown())).nullish(),
  endorser: z.array(z.record(z.string(), z.unknown())).nullish(),
  use_context: z.array(z.record(z.string(), z.unknown())).nullish(),
  related_artifact: z.array(z.record(z.string(), z.unknown())).nullish(),
  library: z.array(z.record(z.string(), z.unknown())).nullish(),
  participant: z.array(z.record(z.string(), z.unknown())).nullish(),
  dosage: z.array(z.record(z.string(), z.unknown())).nullish(),
  dynamic_value: z.array(z.record(z.string(), z.unknown())).nullish(),

  // Typed sub-resource arrays — fhir-gql itself types these
  jurisdiction: z.array(ActivityDefinitionCodeableConceptResponseSchema).nullish(),
  topic: z.array(ActivityDefinitionCodeableConceptResponseSchema).nullish(),
  body_site: z.array(ActivityDefinitionCodeableConceptResponseSchema).nullish(),
  specimen_requirement: z.array(ActivityDefinitionReferenceResponseSchema).nullish(),
  observation_requirement: z.array(ActivityDefinitionReferenceResponseSchema).nullish(),
  observation_result_requirement: z.array(ActivityDefinitionReferenceResponseSchema).nullish(),

  // Tenant / audit fields
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TActivityDefinitionResponse = z.infer<typeof ActivityDefinitionResponseSchema>;

/** Paginated list response — { total, limit, offset, data: TActivityDefinitionResponse[] }. */
export const PaginatedActivityDefinitionResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(ActivityDefinitionResponseSchema),
});
export type TPaginatedActivityDefinitionResponse = z.infer<
  typeof PaginatedActivityDefinitionResponseSchema
>;
