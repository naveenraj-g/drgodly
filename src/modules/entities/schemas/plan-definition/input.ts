/**
 * PlanDefinition input validation schemas and DTO types.
 *
 * Layer: entities / schemas / plan-definition
 *
 * Mirrors fhir-gql's input Pydantic models (app/schemas/plan_definition/input.py).
 * Covers: input sub-schemas, create / patch / list / getById / delete validation schemas.
 *
 * `status` is a strict FHIR-fixed value set (draft|active|retired|unknown) —
 * unlike the terminology-bound coded fields below, it's a real enum.
 * Every other coded/enum-shaped field (identifier.use, telecom.system,
 * action.priority, etc.) stays `z.string()` — fhir-gql itself types most of
 * these as `Optional[str]` or extensible-binding enums, and several (code,
 * reason, jurisdiction, topic) come from the live terminology server via
 * TerminologySelect, which may return codes outside any hand-typed list.
 *
 * PlanDefinition's action tree is genuinely recursive (action.action is the
 * same shape, nested) — modeled with z.lazy(). The deeply choice-typed,
 * rarely-edited pieces (trigger, condition, input/output DataRequirement,
 * related_action, dynamic_value, contact/use_context/related_artifact lists)
 * are accepted as loose JSON records rather than fully re-modeling every FHIR
 * choice-type union — same simplification fhir-gql's own "Plain" response
 * model already makes for these fields (see response.ts).
 */

import { z } from "zod";
import { ApplyDefinitionBodySchema } from "@/modules/entities/schemas/definition-apply/input";

// ── Status enum ─────────────────────────────────────────────────────────────

export const PlanDefinitionStatusSchema = z.enum([
  "draft",
  "active",
  "retired",
  "unknown",
]);
export type TPlanDefinitionStatus = z.infer<typeof PlanDefinitionStatusSchema>;

// ── Input sub-schemas ──────────────────────────────────────────────────────────

/** Shared shape for every simple CodeableConcept sub-resource (jurisdiction, topic, goal.addresses, action.code/reason). */
export const PlanDefinitionCodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TPlanDefinitionCodeableConceptInput = z.infer<
  typeof PlanDefinitionCodeableConceptInputSchema
>;

/** goal.target — measure, detail[x], and a due duration; accepted as loose JSON (choice-typed, rarely edited by hand). */
export const PlanDefinitionGoalTargetInputSchema = z.record(z.string(), z.unknown());
export type TPlanDefinitionGoalTargetInput = z.infer<
  typeof PlanDefinitionGoalTargetInputSchema
>;

/** One goal entry. `description_*` is required (goal.description is 1..1 per R4). */
export const PlanDefinitionGoalInputSchema = z.object({
  element_id: z.string().optional(),
  category_system: z.string().optional(),
  category_code: z.string().optional(),
  category_display: z.string().optional(),
  category_text: z.string().optional(),
  description_system: z.string().optional(),
  description_code: z.string().optional(),
  description_display: z.string().optional(),
  description_text: z.string().optional(),
  priority_system: z.string().optional(),
  priority_code: z.string().optional(),
  priority_display: z.string().optional(),
  priority_text: z.string().optional(),
  start_system: z.string().optional(),
  start_code: z.string().optional(),
  start_display: z.string().optional(),
  start_text: z.string().optional(),
  addresses: z.array(PlanDefinitionCodeableConceptInputSchema).optional(),
  documentation: z.array(z.record(z.string(), z.unknown())).optional(),
  target: z.array(PlanDefinitionGoalTargetInputSchema).optional(),
});
export type TPlanDefinitionGoalInput = z.infer<typeof PlanDefinitionGoalInputSchema>;

/**
 * One action entry — recursive via `action` (nested sub-actions). The
 * choice-typed/deeply-nested pieces (trigger, condition, input, output,
 * related_action, dynamic_value, timing_* other than period) are loose JSON.
 */
export interface TPlanDefinitionActionInput {
  element_id?: string;
  prefix?: string;
  title?: string;
  description?: string;
  text_equivalent?: string;
  priority?: string;
  code?: TPlanDefinitionCodeableConceptInput[];
  reason?: TPlanDefinitionCodeableConceptInput[];
  documentation?: Record<string, unknown>[];
  goal_id?: string[];
  subject_cc_system?: string;
  subject_cc_code?: string;
  subject_cc_display?: string;
  subject_cc_text?: string;
  subject_reference?: string;
  subject_reference_display?: string;
  trigger?: Record<string, unknown>[];
  condition?: Record<string, unknown>[];
  input?: Record<string, unknown>[];
  output?: Record<string, unknown>[];
  related_action?: Record<string, unknown>[];
  timing_datetime?: string;
  timing_age?: Record<string, unknown>;
  timing_period?: Record<string, unknown>;
  timing_duration?: Record<string, unknown>;
  timing_range?: Record<string, unknown>;
  timing_timing?: Record<string, unknown>;
  participant?: Record<string, unknown>[];
  type_system?: string;
  type_code?: string;
  type_display?: string;
  type_text?: string;
  grouping_behavior?: string;
  selection_behavior?: string;
  required_behavior?: string;
  precheck_behavior?: string;
  cardinality_behavior?: string;
  definition_canonical?: string;
  definition_uri?: string;
  transform?: string;
  dynamic_value?: Record<string, unknown>[];
  action?: TPlanDefinitionActionInput[];
}

export const PlanDefinitionActionInputSchema: z.ZodType<TPlanDefinitionActionInput> =
  z.lazy(() =>
    z.object({
      element_id: z.string().optional(),
      prefix: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      text_equivalent: z.string().optional(),
      priority: z.string().optional(),
      code: z.array(PlanDefinitionCodeableConceptInputSchema).optional(),
      reason: z.array(PlanDefinitionCodeableConceptInputSchema).optional(),
      documentation: z.array(z.record(z.string(), z.unknown())).optional(),
      goal_id: z.array(z.string()).optional(),
      subject_cc_system: z.string().optional(),
      subject_cc_code: z.string().optional(),
      subject_cc_display: z.string().optional(),
      subject_cc_text: z.string().optional(),
      subject_reference: z.string().optional(),
      subject_reference_display: z.string().optional(),
      trigger: z.array(z.record(z.string(), z.unknown())).optional(),
      condition: z.array(z.record(z.string(), z.unknown())).optional(),
      input: z.array(z.record(z.string(), z.unknown())).optional(),
      output: z.array(z.record(z.string(), z.unknown())).optional(),
      related_action: z.array(z.record(z.string(), z.unknown())).optional(),
      timing_datetime: z.string().optional(),
      timing_age: z.record(z.string(), z.unknown()).optional(),
      timing_period: z.record(z.string(), z.unknown()).optional(),
      timing_duration: z.record(z.string(), z.unknown()).optional(),
      timing_range: z.record(z.string(), z.unknown()).optional(),
      timing_timing: z.record(z.string(), z.unknown()).optional(),
      participant: z.array(z.record(z.string(), z.unknown())).optional(),
      type_system: z.string().optional(),
      type_code: z.string().optional(),
      type_display: z.string().optional(),
      type_text: z.string().optional(),
      grouping_behavior: z.string().optional(),
      selection_behavior: z.string().optional(),
      required_behavior: z.string().optional(),
      precheck_behavior: z.string().optional(),
      cardinality_behavior: z.string().optional(),
      definition_canonical: z.string().optional(),
      definition_uri: z.string().optional(),
      transform: z.string().optional(),
      dynamic_value: z.array(z.record(z.string(), z.unknown())).optional(),
      action: z.array(PlanDefinitionActionInputSchema).optional(),
    }),
  );

// ── Input validation schemas ───────────────────────────────────────────────────

/**
 * Full schema for creating a PlanDefinition. Mirrors fhir-gql's
 * PlanDefinitionCreateSchema — only `status` is required (R4 1..1).
 */
export const CreatePlanDefinitionValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  created_by: z.string().optional(),

  url: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  status: PlanDefinitionStatusSchema,
  experimental: z.boolean().optional(),
  date: z.string().optional(),
  publisher: z.string().optional(),
  description: z.string().optional(),
  purpose: z.string().optional(),
  usage: z.string().optional(),
  copyright: z.string().optional(),
  approval_date: z.string().optional(),
  last_review_date: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),

  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),

  /** Choice type subject[x] — at most one of the CodeableConcept fields or `subject_reference`. */
  subject_cc_system: z.string().optional(),
  subject_cc_code: z.string().optional(),
  subject_cc_display: z.string().optional(),
  subject_cc_text: z.string().optional(),
  subject_reference: z.string().optional(),
  subject_reference_display: z.string().optional(),

  identifier: z.array(z.record(z.string(), z.unknown())).optional(),
  contact: z.array(z.record(z.string(), z.unknown())).optional(),
  author: z.array(z.record(z.string(), z.unknown())).optional(),
  editor: z.array(z.record(z.string(), z.unknown())).optional(),
  reviewer: z.array(z.record(z.string(), z.unknown())).optional(),
  endorser: z.array(z.record(z.string(), z.unknown())).optional(),
  use_context: z.array(z.record(z.string(), z.unknown())).optional(),
  jurisdiction: z.array(PlanDefinitionCodeableConceptInputSchema).optional(),
  topic: z.array(PlanDefinitionCodeableConceptInputSchema).optional(),
  related_artifact: z.array(z.record(z.string(), z.unknown())).optional(),
  library: z.array(z.string()).optional(),
  goal: z.array(PlanDefinitionGoalInputSchema).optional(),
  action: z.array(PlanDefinitionActionInputSchema).optional(),
});
export type TCreatePlanDefinition = z.infer<typeof CreatePlanDefinitionValidationSchema>;

/**
 * Base patch fields (no id) — used as the service dto and the foundation for
 * the full validation schema. Child lists use REPLACE semantics per
 * fhir-gql's PlanDefinitionPatchSchema: a list sent replaces the stored one
 * in full, `[]`/null clears it, an omitted list is left untouched.
 */
const PatchPlanDefinitionBaseSchema = z.object({
  url: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  /** Cannot be null per fhir-gql's PlanDefinitionPatchSchema — omit to leave unchanged. */
  status: PlanDefinitionStatusSchema.optional(),
  experimental: z.boolean().optional(),
  date: z.string().optional(),
  publisher: z.string().optional(),
  description: z.string().optional(),
  purpose: z.string().optional(),
  usage: z.string().optional(),
  copyright: z.string().optional(),
  approval_date: z.string().optional(),
  last_review_date: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  subject_cc_system: z.string().optional(),
  subject_cc_code: z.string().optional(),
  subject_cc_display: z.string().optional(),
  subject_cc_text: z.string().optional(),
  subject_reference: z.string().optional(),
  subject_reference_display: z.string().optional(),
  updated_by: z.string().optional(),

  identifier: z.array(z.record(z.string(), z.unknown())).optional(),
  contact: z.array(z.record(z.string(), z.unknown())).optional(),
  author: z.array(z.record(z.string(), z.unknown())).optional(),
  editor: z.array(z.record(z.string(), z.unknown())).optional(),
  reviewer: z.array(z.record(z.string(), z.unknown())).optional(),
  endorser: z.array(z.record(z.string(), z.unknown())).optional(),
  use_context: z.array(z.record(z.string(), z.unknown())).optional(),
  jurisdiction: z.array(PlanDefinitionCodeableConceptInputSchema).optional(),
  topic: z.array(PlanDefinitionCodeableConceptInputSchema).optional(),
  related_artifact: z.array(z.record(z.string(), z.unknown())).optional(),
  library: z.array(z.string()).optional(),
  goal: z.array(PlanDefinitionGoalInputSchema).optional(),
  action: z.array(PlanDefinitionActionInputSchema).optional(),
});

/** Dto variant (no id) — used by the service interface update method. */
export const PatchPlanDefinitionDtoSchema = PatchPlanDefinitionBaseSchema;
export type TPatchPlanDefinitionDto = z.infer<typeof PatchPlanDefinitionDtoSchema>;

/** Full patch validation schema — includes id and enforces at least one patchable field. */
export const PatchPlanDefinitionValidationSchema = PatchPlanDefinitionBaseSchema.extend({
  id: z.number(),
}).refine(
  (fields) => Object.entries(fields).some(([key, value]) => key !== "id" && value !== undefined),
  { message: "At least one field must be provided for update" },
);
export type TPatchPlanDefinition = z.infer<typeof PatchPlanDefinitionValidationSchema>;

/** Query parameters for listing plan definitions (server-side filtering + pagination). */
export const ListPlanDefinitionsValidationSchema = z.object({
  org_id: z.string().optional(),
  id: z.string().optional(),
  identifier: z.string().optional(),
  url: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  publisher: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  topic: z.string().optional(),
  jurisdiction: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListPlanDefinitionsQuery = z.infer<typeof ListPlanDefinitionsValidationSchema>;

export const GetPlanDefinitionByIdValidationSchema = z.object({ id: z.number() });
export type TGetPlanDefinitionById = z.infer<typeof GetPlanDefinitionByIdValidationSchema>;

export const DeletePlanDefinitionValidationSchema = z.object({ id: z.number() });
export type TDeletePlanDefinition = z.infer<typeof DeletePlanDefinitionValidationSchema>;

/**
 * Body of `PlanDefinition/$apply` — the shared apply body plus `selected_actions`
 * (`action[].id` values to apply; omit to apply every action).
 */
export const ApplyPlanDefinitionBodySchema = ApplyDefinitionBodySchema.extend({
  selected_actions: z.array(z.string()).optional(),
});
export type TApplyPlanDefinitionDto = z.infer<typeof ApplyPlanDefinitionBodySchema>;

/** Controller input: the plan's public id plus the apply body. */
export const ApplyPlanDefinitionValidationSchema = ApplyPlanDefinitionBodySchema.extend({
  id: z.number(),
});
export type TApplyPlanDefinition = z.infer<typeof ApplyPlanDefinitionValidationSchema>;
