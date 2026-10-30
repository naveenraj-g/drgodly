/**
 * ActivityDefinition input validation schemas and DTO types.
 *
 * Layer: entities / schemas / activity-definition
 *
 * Mirrors fhir-gql's input Pydantic models (app/schemas/activity_definition/input.py).
 * Covers: create / patch / list / getById / delete validation schemas.
 *
 * fhir-gql's own Create/Patch models enforce FHIR's choice-type rules
 * (subject[x], timing[x], product[x] — exactly one variant) and deep nested
 * datatypes (Dosage, DoseAndRate, Ratio, ...) via Pydantic model_validators.
 * Those business rules are enforced server-side regardless of what this
 * schema allows through, so — matching response.ts's own treatment of the
 * same fields — the deeply nested array sub-resources are passed through as
 * `z.record`/`z.array(z.record)` rather than re-modelling every choice-typed
 * Pydantic sub-model here. All coded/enum-shaped fields (status, kind,
 * intent, priority) ARE validated against the real FHIR value sets below,
 * since those are small, stable, and worth catching client-side early.
 */

import { z } from "zod";
import {
  ApplyDefinitionBodySchema,
  type TApplyDefinitionBody,
} from "@/modules/entities/schemas/definition-apply/input";

// ── Enums (FHIR R4 required bindings) ────────────────────────────────────────

export const ActivityDefinitionStatusSchema = z.enum(["draft", "active", "retired", "unknown"]);
export type TActivityDefinitionStatus = z.infer<typeof ActivityDefinitionStatusSchema>;

export const ActivityDefinitionIntentSchema = z.enum([
  "proposal",
  "plan",
  "directive",
  "order",
  "original-order",
  "reflex-order",
  "filler-order",
  "instance-order",
  "option",
]);
export type TActivityDefinitionIntent = z.infer<typeof ActivityDefinitionIntentSchema>;

export const ActivityDefinitionPrioritySchema = z.enum(["routine", "urgent", "asap", "stat"]);
export type TActivityDefinitionPriority = z.infer<typeof ActivityDefinitionPrioritySchema>;

// ── Input sub-schemas (typed) ─────────────────────────────────────────────────

/** Shared shape for jurisdiction/topic/body_site CodeableConcepts. */
export const ActivityDefinitionCodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TActivityDefinitionCodeableConceptInput = z.infer<
  typeof ActivityDefinitionCodeableConceptInputSchema
>;

/** specimen/observation/observation-result requirement — a bare reference row. */
export const ActivityDefinitionReferenceInputSchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type TActivityDefinitionReferenceInput = z.infer<
  typeof ActivityDefinitionReferenceInputSchema
>;

// ── Create / Patch ─────────────────────────────────────────────────────────────

/**
 * Full schema for creating an ActivityDefinition. Only `status` is required
 * (FHIR R4 1..1); deeply nested arrays (dosage, participant, dynamic_value,
 * contact/author/editor/reviewer/endorser, use_context, related_artifact,
 * library, identifier) are passed through as loosely-typed records — see
 * file header.
 */
export const CreateActivityDefinitionValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  created_by: z.string().optional(),

  url: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  status: ActivityDefinitionStatusSchema,
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

  // subject[x] — provide one of the CodeableConcept fields OR subject_reference
  subject_cc_system: z.string().optional(),
  subject_cc_code: z.string().optional(),
  subject_cc_display: z.string().optional(),
  subject_cc_text: z.string().optional(),
  subject_reference: z.string().optional(),
  subject_reference_display: z.string().optional(),

  kind: z.string().optional(),
  profile: z.string().optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  intent: ActivityDefinitionIntentSchema.optional(),
  priority: ActivityDefinitionPrioritySchema.optional(),
  do_not_perform: z.boolean().optional(),

  // timing[x] — provide exactly one
  timing_datetime: z.string().optional(),
  timing_age: z.record(z.string(), z.unknown()).optional(),
  timing_period: z.record(z.string(), z.unknown()).optional(),
  timing_range: z.record(z.string(), z.unknown()).optional(),
  timing_duration: z.record(z.string(), z.unknown()).optional(),
  timing_timing: z.record(z.string(), z.unknown()).optional(),

  location: z.string().optional(),
  location_display: z.string().optional(),

  // product[x]
  product_reference: z.string().optional(),
  product_reference_display: z.string().optional(),
  product_cc_system: z.string().optional(),
  product_cc_code: z.string().optional(),
  product_cc_display: z.string().optional(),
  product_cc_text: z.string().optional(),

  quantity: z.record(z.string(), z.unknown()).optional(),
  transform: z.string().optional(),

  identifier: z.array(z.record(z.string(), z.unknown())).optional(),
  contact: z.array(z.record(z.string(), z.unknown())).optional(),
  author: z.array(z.record(z.string(), z.unknown())).optional(),
  editor: z.array(z.record(z.string(), z.unknown())).optional(),
  reviewer: z.array(z.record(z.string(), z.unknown())).optional(),
  endorser: z.array(z.record(z.string(), z.unknown())).optional(),
  use_context: z.array(z.record(z.string(), z.unknown())).optional(),
  jurisdiction: z.array(ActivityDefinitionCodeableConceptInputSchema).optional(),
  topic: z.array(ActivityDefinitionCodeableConceptInputSchema).optional(),
  related_artifact: z.array(z.record(z.string(), z.unknown())).optional(),
  library: z.array(z.string()).optional(),
  participant: z.array(z.record(z.string(), z.unknown())).optional(),
  dosage: z.array(z.record(z.string(), z.unknown())).optional(),
  body_site: z.array(ActivityDefinitionCodeableConceptInputSchema).optional(),
  specimen_requirement: z.array(ActivityDefinitionReferenceInputSchema).optional(),
  observation_requirement: z.array(ActivityDefinitionReferenceInputSchema).optional(),
  observation_result_requirement: z.array(ActivityDefinitionReferenceInputSchema).optional(),
  dynamic_value: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type TCreateActivityDefinition = z.infer<typeof CreateActivityDefinitionValidationSchema>;

/**
 * Base patch fields (no id) — mirrors fhir-gql's ActivityDefinitionPatchSchema.
 * Child lists use REPLACE semantics server-side: a list sent replaces the
 * stored one in full, an omitted list is left untouched.
 */
const PatchActivityDefinitionBaseSchema = z.object({
  url: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  status: ActivityDefinitionStatusSchema.optional(),
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
  subject_cc_system: z.string().optional(),
  subject_cc_code: z.string().optional(),
  subject_cc_display: z.string().optional(),
  subject_cc_text: z.string().optional(),
  subject_reference: z.string().optional(),
  subject_reference_display: z.string().optional(),
  kind: z.string().optional(),
  profile: z.string().optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  intent: ActivityDefinitionIntentSchema.optional(),
  priority: ActivityDefinitionPrioritySchema.optional(),
  do_not_perform: z.boolean().optional(),
  timing_datetime: z.string().optional(),
  timing_age: z.record(z.string(), z.unknown()).optional(),
  timing_period: z.record(z.string(), z.unknown()).optional(),
  timing_range: z.record(z.string(), z.unknown()).optional(),
  timing_duration: z.record(z.string(), z.unknown()).optional(),
  timing_timing: z.record(z.string(), z.unknown()).optional(),
  location: z.string().optional(),
  location_display: z.string().optional(),
  product_reference: z.string().optional(),
  product_reference_display: z.string().optional(),
  product_cc_system: z.string().optional(),
  product_cc_code: z.string().optional(),
  product_cc_display: z.string().optional(),
  product_cc_text: z.string().optional(),
  quantity: z.record(z.string(), z.unknown()).optional(),
  transform: z.string().optional(),
  updated_by: z.string().optional(),

  identifier: z.array(z.record(z.string(), z.unknown())).optional(),
  contact: z.array(z.record(z.string(), z.unknown())).optional(),
  author: z.array(z.record(z.string(), z.unknown())).optional(),
  editor: z.array(z.record(z.string(), z.unknown())).optional(),
  reviewer: z.array(z.record(z.string(), z.unknown())).optional(),
  endorser: z.array(z.record(z.string(), z.unknown())).optional(),
  use_context: z.array(z.record(z.string(), z.unknown())).optional(),
  jurisdiction: z.array(ActivityDefinitionCodeableConceptInputSchema).optional(),
  topic: z.array(ActivityDefinitionCodeableConceptInputSchema).optional(),
  related_artifact: z.array(z.record(z.string(), z.unknown())).optional(),
  library: z.array(z.string()).optional(),
  participant: z.array(z.record(z.string(), z.unknown())).optional(),
  dosage: z.array(z.record(z.string(), z.unknown())).optional(),
  body_site: z.array(ActivityDefinitionCodeableConceptInputSchema).optional(),
  specimen_requirement: z.array(ActivityDefinitionReferenceInputSchema).optional(),
  observation_requirement: z.array(ActivityDefinitionReferenceInputSchema).optional(),
  observation_result_requirement: z.array(ActivityDefinitionReferenceInputSchema).optional(),
  dynamic_value: z.array(z.record(z.string(), z.unknown())).optional(),
});

/** Dto variant (no id) — used by the service interface update method. */
export const PatchActivityDefinitionDtoSchema = PatchActivityDefinitionBaseSchema;
export type TPatchActivityDefinitionDto = z.infer<typeof PatchActivityDefinitionDtoSchema>;

/** Full patch validation schema — includes id and enforces at least one patchable field. */
export const PatchActivityDefinitionValidationSchema = PatchActivityDefinitionBaseSchema.extend({
  id: z.number(),
}).refine(
  (fields) => Object.entries(fields).some(([key, value]) => key !== "id" && value !== undefined),
  { message: "At least one field must be provided for update" },
);
export type TPatchActivityDefinition = z.infer<typeof PatchActivityDefinitionValidationSchema>;

/**
 * Query parameters for listing ActivityDefinitions (server-side filtering +
 * pagination). Mirrors fhir-gql's ListActivityDefinitionsSchema — org_id is
 * mandatory there, but stamped server-side from the session here (see
 * core.actions.ts), so it's optional on the client-facing schema.
 */
export const ListActivityDefinitionsValidationSchema = z.object({
  org_id: z.string().optional(),
  user_id: z.string().optional(),
  id: z.string().optional(),
  identifier: z.string().optional(),
  url: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  name_contains: z.string().optional(),
  name_exact: z.string().optional(),
  title: z.string().optional(),
  title_contains: z.string().optional(),
  title_exact: z.string().optional(),
  publisher: z.string().optional(),
  publisher_contains: z.string().optional(),
  publisher_exact: z.string().optional(),
  description: z.string().optional(),
  description_contains: z.string().optional(),
  description_exact: z.string().optional(),
  status: z.string().optional(),
  topic: z.string().optional(),
  jurisdiction: z.string().optional(),
  context: z.string().optional(),
  context_type: z.string().optional(),
  depends_on: z.string().optional(),
  derived_from: z.string().optional(),
  predecessor: z.string().optional(),
  successor: z.string().optional(),
  composed_of: z.string().optional(),
  date: z.array(z.string()).optional(),
  effective: z.array(z.string()).optional(),
  last_updated: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListActivityDefinitionsQuery = z.infer<
  typeof ListActivityDefinitionsValidationSchema
>;

export const GetByIdActivityDefinitionValidationSchema = z.object({ id: z.number() });
export type TGetByIdActivityDefinition = z.infer<
  typeof GetByIdActivityDefinitionValidationSchema
>;

export const DeleteActivityDefinitionValidationSchema = z.object({ id: z.number() });
export type TDeleteActivityDefinition = z.infer<
  typeof DeleteActivityDefinitionValidationSchema
>;

/** Body of `ActivityDefinition/$apply` — the shared apply body. */
export type TApplyActivityDefinitionDto = TApplyDefinitionBody;

/** Controller input: the definition's public id plus the apply body. */
export const ApplyActivityDefinitionValidationSchema = ApplyDefinitionBodySchema.extend({
  id: z.number(),
});
export type TApplyActivityDefinition = z.infer<
  typeof ApplyActivityDefinitionValidationSchema
>;
