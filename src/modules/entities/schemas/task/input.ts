/**
 * Task input/validation schemas.
 *
 * Layer: entities / schemas / task
 *
 * Mirrors fhir-gql's TaskCreateSchema / TaskPatchSchema / ListTasksSchema
 * (see fhir-gql/app/schemas/task/input.py). `status` and `intent` are
 * required on create — every other field is optional per FHIR R4.
 * Child arrays (identifiers, based_on, part_of, performer_types, insurance,
 * notes, relevant_history, restriction_recipients, inputs, outputs) use
 * REPLACE semantics on patch — send the full list, [] clears it, an
 * omitted field leaves it untouched.
 * URL path: POST/GET/PATCH/DELETE /tasks/
 */

import { z } from "zod";

// ── Child array input schemas ─────────────────────────────────────────────────

const TaskIdentifierInputSchema = z.object({
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

/** Shared shape for based_on / part_of / insurance / relevant_history / restriction_recipients. */
const TaskReferenceChildInputSchema = z.object({
  /** FHIR reference e.g. "ServiceRequest/80001". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const TaskPerformerTypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const TaskNoteInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  /** FHIR reference e.g. "Practitioner/30001". */
  author_reference: z.string().optional(),
  author_reference_display: z.string().optional(),
});

/**
 * Shared shape of Task.input[] / Task.output[] — a `type` CodeableConcept plus
 * exactly one value[x] variant (enforced server-side, not duplicated here).
 */
const TaskValueItemInputSchema = z.object({
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),

  value_boolean: z.boolean().optional(),
  value_code: z.string().optional(),
  value_date: z.string().optional(),
  value_date_time: z.string().optional(),
  value_decimal: z.number().optional(),
  value_integer: z.number().optional(),
  value_string: z.string().optional(),
  value_uri: z.string().optional(),
  value_time: z.string().optional(),
  value_instant: z.string().optional(),
  value_markdown: z.string().optional(),
  value_canonical: z.string().optional(),
  value_url: z.string().optional(),
  value_positive_int: z.number().int().min(1).optional(),
  value_unsigned_int: z.number().int().min(0).optional(),
  value_base64_binary: z.string().optional(),
  value_id: z.string().optional(),

  /** Open reference, e.g. "Observation/160001". */
  value_reference: z.string().optional(),
  value_reference_display: z.string().optional(),

  value_coding_system: z.string().optional(),
  value_coding_code: z.string().optional(),
  value_coding_display: z.string().optional(),

  value_codeable_concept_system: z.string().optional(),
  value_codeable_concept_code: z.string().optional(),
  value_codeable_concept_display: z.string().optional(),
  value_codeable_concept_text: z.string().optional(),

  value_quantity_value: z.number().optional(),
  value_quantity_unit: z.string().optional(),
  value_quantity_system: z.string().optional(),
  value_quantity_code: z.string().optional(),

  value_period_start: z.string().optional(),
  value_period_end: z.string().optional(),

  value_range_low_value: z.number().optional(),
  value_range_low_unit: z.string().optional(),
  value_range_high_value: z.number().optional(),
  value_range_high_unit: z.string().optional(),

  value_attachment_content_type: z.string().optional(),
  value_attachment_language: z.string().optional(),
  /** base64Binary content. */
  value_attachment_data: z.string().optional(),
  value_attachment_url: z.string().optional(),
  value_attachment_size: z.number().int().min(0).optional(),
  value_attachment_hash: z.string().optional(),
  value_attachment_title: z.string().optional(),
  value_attachment_creation: z.string().optional(),

  value_identifier_use: z.string().optional(),
  value_identifier_system: z.string().optional(),
  value_identifier_value: z.string().optional(),

  value_money_value: z.number().optional(),
  /** ISO 4217 currency code. */
  value_money_currency: z.string().optional(),

  value_ratio_numerator_value: z.number().optional(),
  value_ratio_numerator_unit: z.string().optional(),
  value_ratio_denominator_value: z.number().optional(),
  value_ratio_denominator_unit: z.string().optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /tasks/.
 * `status` and `intent` are required; everything else is optional.
 */
export const CreateTaskValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  created_by: z.string().optional(),

  /** draft | requested | received | accepted | rejected | ready | cancelled | in-progress | on-hold | failed | completed | entered-in-error */
  status: z.string(),
  /** unknown | proposal | plan | order | original-order | reflex-order | filler-order | instance-order | option */
  intent: z.string(),

  /** routine | urgent | asap | stat */
  priority: z.string().optional(),
  description: z.string().optional(),
  instantiates_canonical: z.string().optional(),
  instantiates_uri: z.string().optional(),
  authored_on: z.string().optional(),
  last_modified: z.string().optional(),

  group_identifier_use: z.string().optional(),
  group_identifier_system: z.string().optional(),
  group_identifier_value: z.string().optional(),
  group_identifier_type_system: z.string().optional(),
  group_identifier_type_code: z.string().optional(),
  group_identifier_type_display: z.string().optional(),
  group_identifier_type_text: z.string().optional(),

  status_reason_system: z.string().optional(),
  status_reason_code: z.string().optional(),
  status_reason_display: z.string().optional(),
  status_reason_text: z.string().optional(),

  business_status_system: z.string().optional(),
  business_status_code: z.string().optional(),
  business_status_display: z.string().optional(),
  business_status_text: z.string().optional(),

  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),

  /** Open reference to resource being actioned, e.g. "ServiceRequest/80001". */
  focus: z.string().optional(),
  focus_display: z.string().optional(),

  /** Open reference to entity benefiting from the task, e.g. "Patient/10001". */
  for: z.string().optional(),
  for_display: z.string().optional(),

  /** FHIR reference e.g. "Encounter/20001". */
  encounter: z.string().optional(),
  encounter_display: z.string().optional(),

  execution_period_start: z.string().optional(),
  execution_period_end: z.string().optional(),

  /** Reference to requester — Device/Organization/Patient/Practitioner/PractitionerRole/RelatedPerson. */
  requester: z.string().optional(),
  requester_display: z.string().optional(),

  /** Reference to owner — Practitioner/PractitionerRole/Organization/CareTeam/HealthcareService/Patient/Device/RelatedPerson. */
  owner: z.string().optional(),
  owner_display: z.string().optional(),

  /** FHIR reference e.g. "Location/230001". */
  location: z.string().optional(),
  location_display: z.string().optional(),

  reason_code_system: z.string().optional(),
  reason_code_code: z.string().optional(),
  reason_code_display: z.string().optional(),
  reason_code_text: z.string().optional(),

  /** Open reference to the reason resource. */
  reason_reference: z.string().optional(),
  reason_reference_display: z.string().optional(),

  restriction_repetitions: z.number().int().optional(),
  restriction_period_start: z.string().optional(),
  restriction_period_end: z.string().optional(),

  identifiers: z.array(TaskIdentifierInputSchema).optional(),
  based_on: z.array(TaskReferenceChildInputSchema).optional(),
  part_of: z.array(TaskReferenceChildInputSchema).optional(),
  performer_types: z.array(TaskPerformerTypeInputSchema).optional(),
  insurance: z.array(TaskReferenceChildInputSchema).optional(),
  notes: z.array(TaskNoteInputSchema).optional(),
  relevant_history: z.array(TaskReferenceChildInputSchema).optional(),
  restriction_recipients: z.array(TaskReferenceChildInputSchema).optional(),
  inputs: z.array(TaskValueItemInputSchema).optional(),
  outputs: z.array(TaskValueItemInputSchema).optional(),
});
export type TCreateTask = z.infer<typeof CreateTaskValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateTaskBaseSchema = z.object({
  status: z.string().optional(),
  intent: z.string().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
  instantiates_canonical: z.string().optional(),
  instantiates_uri: z.string().optional(),
  authored_on: z.string().optional(),
  last_modified: z.string().optional(),

  group_identifier_use: z.string().optional(),
  group_identifier_system: z.string().optional(),
  group_identifier_value: z.string().optional(),
  group_identifier_type_system: z.string().optional(),
  group_identifier_type_code: z.string().optional(),
  group_identifier_type_display: z.string().optional(),
  group_identifier_type_text: z.string().optional(),

  status_reason_system: z.string().optional(),
  status_reason_code: z.string().optional(),
  status_reason_display: z.string().optional(),
  status_reason_text: z.string().optional(),

  business_status_system: z.string().optional(),
  business_status_code: z.string().optional(),
  business_status_display: z.string().optional(),
  business_status_text: z.string().optional(),

  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),

  focus: z.string().optional(),
  focus_display: z.string().optional(),

  for: z.string().optional(),
  for_display: z.string().optional(),

  encounter: z.string().optional(),
  encounter_display: z.string().optional(),

  execution_period_start: z.string().optional(),
  execution_period_end: z.string().optional(),

  requester: z.string().optional(),
  requester_display: z.string().optional(),

  owner: z.string().optional(),
  owner_display: z.string().optional(),

  location: z.string().optional(),
  location_display: z.string().optional(),

  reason_code_system: z.string().optional(),
  reason_code_code: z.string().optional(),
  reason_code_display: z.string().optional(),
  reason_code_text: z.string().optional(),

  reason_reference: z.string().optional(),
  reason_reference_display: z.string().optional(),

  restriction_repetitions: z.number().int().optional(),
  restriction_period_start: z.string().optional(),
  restriction_period_end: z.string().optional(),

  identifiers: z.array(TaskIdentifierInputSchema).optional(),
  based_on: z.array(TaskReferenceChildInputSchema).optional(),
  part_of: z.array(TaskReferenceChildInputSchema).optional(),
  performer_types: z.array(TaskPerformerTypeInputSchema).optional(),
  insurance: z.array(TaskReferenceChildInputSchema).optional(),
  notes: z.array(TaskNoteInputSchema).optional(),
  relevant_history: z.array(TaskReferenceChildInputSchema).optional(),
  restriction_recipients: z.array(TaskReferenceChildInputSchema).optional(),
  inputs: z.array(TaskValueItemInputSchema).optional(),
  outputs: z.array(TaskValueItemInputSchema).optional(),
  updated_by: z.string().optional(),
});

export const UpdateTaskDtoSchema = UpdateTaskBaseSchema;
export type TUpdateTaskDto = z.infer<typeof UpdateTaskDtoSchema>;

export const UpdateTaskValidationSchema = UpdateTaskBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateTask = z.infer<typeof UpdateTaskValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

/**
 * Search params for GET /tasks/. Token params (status, intent, priority, code,
 * business_status, identifier, group_identifier, performer) accept comma-joined
 * OR lists; reference params (subject, patient, focus, encounter, owner,
 * requester, based_on, part_of) accept "Type/id" or a bare numeric id.
 */
export const ListTasksValidationSchema = z.object({
  id: z.string().optional(),
  identifier: z.string().optional(),
  group_identifier: z.string().optional(),
  status: z.string().optional(),
  intent: z.string().optional(),
  priority: z.string().optional(),
  code: z.string().optional(),
  business_status: z.string().optional(),
  subject: z.string().optional(),
  patient: z.string().optional(),
  focus: z.string().optional(),
  encounter: z.string().optional(),
  owner: z.string().optional(),
  requester: z.string().optional(),
  performer: z.string().optional(),
  based_on: z.string().optional(),
  part_of: z.string().optional(),
  authored_on: z.array(z.string()).optional(),
  modified: z.array(z.string()).optional(),
  period: z.array(z.string()).optional(),
  last_updated: z.array(z.string()).optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListTasksQuery = z.infer<typeof ListTasksValidationSchema>;

export const GetByIdTaskValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdTask = z.infer<typeof GetByIdTaskValidationSchema>;

export const DeleteTaskValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteTask = z.infer<typeof DeleteTaskValidationSchema>;
