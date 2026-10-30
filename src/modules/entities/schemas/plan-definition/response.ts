/**
 * PlanDefinition response schemas.
 *
 * Layer: entities / schemas / plan-definition
 *
 * Mirrors fhir-gql's app/schemas/plan_definition/response.py "Plain" (snake_case)
 * models — the shape the REST API actually returns as application/json. All
 * optional fields use .nullish() — fhir-gql serialises Python's Optional[X] =
 * None as explicit JSON null, not a missing key.
 *
 * PlanDefinition is one of the most deeply nested FHIR resources (recursive
 * action trees, choice-typed triggers/conditions/data-requirements). The
 * backend's own "Plain" response model only gives full typed structure to
 * goal/action/CodeableConcept — everything else genuinely complex (trigger,
 * condition, input, output, related_action, dynamic_value, contact lists,
 * use_context, related_artifact, identifier) comes back as loose JSON
 * (Dict[str, Any]) even on the Python side. This mirrors that exactly rather
 * than inventing stricter typing the backend itself doesn't guarantee.
 */

import { z } from "zod";

/** Shared shape for every simple CodeableConcept sub-resource row (jurisdiction, topic, goal.addresses). */
export const PlanDefinitionCodeableConceptResponseSchema = z.object({
  id: z.number().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TPlanDefinitionCodeableConceptResponse = z.infer<
  typeof PlanDefinitionCodeableConceptResponseSchema
>;

/** One goal row — target/documentation are loose JSON, same as the backend's own Plain model. */
export const PlanDefinitionGoalResponseSchema = z.object({
  id: z.number(),
  element_id: z.string().nullish(),
  category_system: z.string().nullish(),
  category_code: z.string().nullish(),
  category_display: z.string().nullish(),
  category_text: z.string().nullish(),
  description_system: z.string().nullish(),
  description_code: z.string().nullish(),
  description_display: z.string().nullish(),
  description_text: z.string().nullish(),
  priority_system: z.string().nullish(),
  priority_code: z.string().nullish(),
  priority_display: z.string().nullish(),
  priority_text: z.string().nullish(),
  start_system: z.string().nullish(),
  start_code: z.string().nullish(),
  start_display: z.string().nullish(),
  start_text: z.string().nullish(),
  addresses: z.array(PlanDefinitionCodeableConceptResponseSchema).nullish(),
  documentation: z.array(z.record(z.string(), z.unknown())).nullish(),
  target: z.array(z.record(z.string(), z.unknown())).nullish(),
});
export type TPlanDefinitionGoalResponse = z.infer<typeof PlanDefinitionGoalResponseSchema>;

/**
 * One action row. `action` (sub-actions) is loose JSON even in the backend's
 * own Plain response model — the recursion isn't strongly typed there either.
 */
export const PlanDefinitionActionResponseSchema = z.object({
  id: z.number(),
  element_id: z.string().nullish(),
  prefix: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  text_equivalent: z.string().nullish(),
  priority: z.string().nullish(),
  code: z.array(PlanDefinitionCodeableConceptResponseSchema).nullish(),
  reason: z.array(PlanDefinitionCodeableConceptResponseSchema).nullish(),
  documentation: z.array(z.record(z.string(), z.unknown())).nullish(),
  goal_id: z.array(z.string()).nullish(),
  subject_cc_system: z.string().nullish(),
  subject_cc_code: z.string().nullish(),
  subject_cc_display: z.string().nullish(),
  subject_cc_text: z.string().nullish(),
  subject_reference_type: z.string().nullish(),
  subject_reference_id: z.number().nullish(),
  subject_reference_display: z.string().nullish(),
  trigger: z.array(z.record(z.string(), z.unknown())).nullish(),
  condition: z.array(z.record(z.string(), z.unknown())).nullish(),
  input: z.array(z.record(z.string(), z.unknown())).nullish(),
  output: z.array(z.record(z.string(), z.unknown())).nullish(),
  related_action: z.array(z.record(z.string(), z.unknown())).nullish(),
  timing_datetime: z.string().nullish(),
  timing_age: z.record(z.string(), z.unknown()).nullish(),
  timing_period: z.record(z.string(), z.unknown()).nullish(),
  timing_duration: z.record(z.string(), z.unknown()).nullish(),
  timing_range: z.record(z.string(), z.unknown()).nullish(),
  timing_timing: z.record(z.string(), z.unknown()).nullish(),
  participant: z.array(z.record(z.string(), z.unknown())).nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  grouping_behavior: z.string().nullish(),
  selection_behavior: z.string().nullish(),
  required_behavior: z.string().nullish(),
  precheck_behavior: z.string().nullish(),
  cardinality_behavior: z.string().nullish(),
  definition_canonical: z.string().nullish(),
  definition_uri: z.string().nullish(),
  transform: z.string().nullish(),
  dynamic_value: z.array(z.record(z.string(), z.unknown())).nullish(),
  action: z.array(z.record(z.string(), z.unknown())).nullish(),
});
export type TPlanDefinitionActionResponse = z.infer<typeof PlanDefinitionActionResponseSchema>;

/** Full PlanDefinition resource returned by the fhir-gql API. */
export const PlanDefinitionResponseSchema = z.object({
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

  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),

  // Choice type subject[x] — flattened CodeableConcept or Reference.
  subject_cc_system: z.string().nullish(),
  subject_cc_code: z.string().nullish(),
  subject_cc_display: z.string().nullish(),
  subject_cc_text: z.string().nullish(),
  subject_reference_type: z.string().nullish(),
  subject_reference_id: z.number().nullish(),
  subject_reference_display: z.string().nullish(),

  // Loose JSON lists — the backend's own Plain model doesn't type these further.
  identifier: z.array(z.record(z.string(), z.unknown())).nullish(),
  contact: z.array(z.record(z.string(), z.unknown())).nullish(),
  author: z.array(z.record(z.string(), z.unknown())).nullish(),
  editor: z.array(z.record(z.string(), z.unknown())).nullish(),
  reviewer: z.array(z.record(z.string(), z.unknown())).nullish(),
  endorser: z.array(z.record(z.string(), z.unknown())).nullish(),
  use_context: z.array(z.record(z.string(), z.unknown())).nullish(),
  related_artifact: z.array(z.record(z.string(), z.unknown())).nullish(),
  library: z.array(z.record(z.string(), z.unknown())).nullish(),

  jurisdiction: z.array(PlanDefinitionCodeableConceptResponseSchema).nullish(),
  topic: z.array(PlanDefinitionCodeableConceptResponseSchema).nullish(),
  goal: z.array(PlanDefinitionGoalResponseSchema).nullish(),
  action: z.array(PlanDefinitionActionResponseSchema).nullish(),

  // Tenant / audit fields
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TPlanDefinitionResponse = z.infer<typeof PlanDefinitionResponseSchema>;

/** Paginated list response — { total, limit, offset, data: TPlanDefinitionResponse[] }. */
export const PaginatedPlanDefinitionResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(PlanDefinitionResponseSchema),
});
export type TPaginatedPlanDefinitionResponse = z.infer<
  typeof PaginatedPlanDefinitionResponseSchema
>;
