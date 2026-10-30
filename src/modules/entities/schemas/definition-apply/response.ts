/**
 * Shared `$apply` response schema (ActivityDefinition + PlanDefinition).
 *
 * Layer: entities / schemas / definition-apply
 *
 * Mirrors fhir-gql's `ApplyResponse` / `SkippedAction` (plain JSON; the FHIR
 * Bundle variant is never requested because we don't send `Accept: application/fhir+json`).
 */

import { z } from "zod";
import { ServiceRequestResponseSchema } from "@/modules/entities/schemas/service-request/response";

/**
 * A generated ServiceRequest. In preview mode (`persist=false`) nothing is
 * saved, so fhir-gql returns `id: null` — the shared schema's `id: number`
 * is relaxed to nullable here only, leaving ServiceRequest reads strict.
 */
export const AppliedServiceRequestSchema = ServiceRequestResponseSchema.extend({
  id: z.number().nullable(),
});
export type TAppliedServiceRequest = z.infer<typeof AppliedServiceRequestSchema>;

/** An action/definition for which no ServiceRequest was generated, with the reason. */
export const SkippedActionSchema = z.object({
  action_id: z.string().nullish(),
  action_title: z.string().nullish(),
  definition: z.string().nullish(),
  reason: z.string(),
});
export type TSkippedAction = z.infer<typeof SkippedActionSchema>;

/** Result of a `$apply` operation. */
export const ApplyDefinitionResponseSchema = z.object({
  /** The applied definition, e.g. `PlanDefinition/400001`. */
  definition: z.string(),
  subject: z.string(),
  encounter: z.string().nullish(),
  /** false = preview only; true = saved. */
  persisted: z.boolean(),
  /** Number of ServiceRequests generated. */
  total: z.number(),
  service_requests: z.array(AppliedServiceRequestSchema),
  skipped: z.array(SkippedActionSchema),
});
export type TApplyDefinitionResponse = z.infer<typeof ApplyDefinitionResponseSchema>;
