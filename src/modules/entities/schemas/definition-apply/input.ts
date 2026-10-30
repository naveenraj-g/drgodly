/**
 * Shared `$apply` request body schema (ActivityDefinition + PlanDefinition).
 *
 * Layer: entities / schemas / definition-apply
 *
 * Mirrors fhir-gql's `ActivityDefinitionApplySchema` (app/schemas/definition_apply.py).
 * Both `POST /activity-definitions/{id}/$apply` and `POST /plan-definitions/{id}/$apply`
 * share this body; the plan variant adds `selected_actions` (defined in the
 * plan-definition schemas, which extend this base).
 */

import { z } from "zod";

/**
 * Body of a `$apply` call. `.strict()` mirrors fhir-gql's `extra="forbid"` so
 * unknown keys fail client-side instead of as a 422 from the gateway.
 */
export const ApplyDefinitionBodySchema = z
  .object({
    /** Tenant org — injected from the session by the server action, never trusted from the client. */
    org_id: z.string().optional(),
    /** Owner stored on the created records when `persist` is true. */
    user_id: z.string().optional(),
    /** Who the requests are for — `Patient/10001` (also Group, Location, Device). */
    subject: z.string().min(1, "Subject is required"),
    subject_display: z.string().optional(),
    /** Optional `Encounter/20001` the requests belong to. */
    encounter: z.string().optional(),
    encounter_display: z.string().optional(),
    /** Requester of the generated orders — `Practitioner/30001` (or PractitionerRole, Organization, ...). */
    practitioner: z.string().optional(),
    practitioner_display: z.string().optional(),
    /** false (default) = preview only; true = save all ServiceRequests in one transaction. */
    persist: z.boolean().optional(),
    /** Status of the generated ServiceRequests (server defaults: draft for preview, active when persisting). */
    status: z.enum(["draft", "active"]).optional(),
    /** false (default) = skip definitions already generated for the same subject/encounter. */
    allow_duplicates: z.boolean().optional(),
  })
  .strict();
export type TApplyDefinitionBody = z.infer<typeof ApplyDefinitionBodySchema>;
