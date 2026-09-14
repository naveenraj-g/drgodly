/**
 * OpenAPI registry for the mobile-facing REST API.
 *
 * Layer: presentation / openapi
 *
 * Single source of truth mapping each /api/{intake,consultation,ai-consultation}/*
 * route to the same Zod schemas the route itself validates against (see
 * src/app/api/{intake,consultation,ai-consultation}/* /route.ts) — so the
 * generated spec can never drift from what a route actually accepts/returns
 * the way a hand-written spec could. Consumed by:
 *   - src/app/api/mobile/openapi.json/route.ts — generates the OpenAPI document
 *   - src/app/api/mobile/docs/route.ts         — renders it via Scalar
 *
 * Request bodies intentionally `.omit()` the fields the route injects from the
 * verified bearer token (userId/user_id/published_by) — the mobile client never
 * sends those, so documenting them as required input would be misleading.
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  CreateIntakeValidationSchema,
  UpdateIntakeValidationSchema,
  LinkIntakeValidationSchema,
  AbandonIntakeValidationSchema,
  GetIntakeByIdValidationSchema,
  GetIntakeByFhirAppointmentIdValidationSchema,
  ListIntakesValidationSchema,
  IntakeResponseSchema,
  PaginatedIntakeResponseSchema,
} from "@/modules/entities/schemas/intake";
import {
  CreateConsultationValidationSchema,
  CompleteConsultationValidationSchema,
  SaveClinicalDataValidationSchema,
  AbandonConsultationValidationSchema,
  GetConsultationByFhirAppointmentIdValidationSchema,
  ListConsultationsValidationSchema,
  ConsultationResponseSchema,
  PaginatedConsultationResponseSchema,
} from "@/modules/entities/schemas/consultation";
import {
  CreateAiConsultationValidationSchema,
  UpdateAiConsultationValidationSchema,
  LinkAiConsultationValidationSchema,
  AbandonAiConsultationValidationSchema,
  GetAiConsultationByIdValidationSchema,
  AiConsultationResponseSchema,
} from "@/modules/entities/schemas/ai-consultation";

export const mobileApiRegistry = new OpenAPIRegistry();

// ── Shared components ─────────────────────────────────────────────────────────

/** Every route requires this — the bearer JWT verified against BETTER_AUTH_JWKS_URL. */
mobileApiRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "Better Auth JWT minted via GET {BETTER_AUTH_URL}/api/auth/token. " +
    "Verified locally against BETTER_AUTH_JWKS_URL — no session cookie required, " +
    "so this works from the mobile app (unlike the web app's server actions, " +
    "which authenticate via a browser session cookie and are unaffected by this API).",
});

const security = [{ bearerAuth: [] }];

/** Shared error body shape returned by mobileErrorResponse for every 400/401/404/etc. */
const ErrorResponseSchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
    fieldErrors: z.record(z.string(), z.array(z.string()).optional()).optional(),
    formErrors: z.array(z.string()).optional(),
  })
  .describe("Error response");

/** application/json request body helper. */
function jsonBody(schema: z.ZodType) {
  return { content: { "application/json": { schema } } };
}

/** application/json response helper, paired with the standard error responses. */
function jsonResponses(successStatus: number, successDescription: string, schema: z.ZodType) {
  return {
    [successStatus]: { description: successDescription, ...jsonBody(schema) },
    400: { description: "Validation error", ...jsonBody(ErrorResponseSchema) },
    401: { description: "Missing, malformed, or expired bearer token", ...jsonBody(ErrorResponseSchema) },
  };
}

// ── Intake ────────────────────────────────────────────────────────────────────

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/intake/create",
  tags: ["Intake"],
  summary: "Start a new intake session",
  description:
    "Creates a new IN_PROGRESS intake session for the calling (token) user. " +
    "userId and org_id are both always taken from the token — never sent by the client.",
  security,
  request: {
    body: jsonBody(CreateIntakeValidationSchema.omit({ userId: true, org_id: true })),
  },
  responses: jsonResponses(201, "Created", IntakeResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/intake/update",
  tags: ["Intake"],
  summary: "Complete an intake session",
  description: "Saves the conversation transcript and AI report, flips status to COMPLETED.",
  security,
  request: { body: jsonBody(UpdateIntakeValidationSchema) },
  responses: jsonResponses(200, "Updated", IntakeResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/intake/link",
  tags: ["Intake"],
  summary: "Link a completed intake to a booked appointment",
  description: "Call immediately after a successful appointment booking when an intake_id was in the booking flow.",
  security,
  request: { body: jsonBody(LinkIntakeValidationSchema) },
  responses: jsonResponses(200, "Linked", IntakeResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/intake/abandon",
  tags: ["Intake"],
  summary: "Abandon an in-progress intake",
  description: "Called when the patient navigates away without completing.",
  security,
  request: { body: jsonBody(AbandonIntakeValidationSchema) },
  responses: jsonResponses(200, "Abandoned", IntakeResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "get",
  path: "/api/intake/get-by-id",
  tags: ["Intake"],
  summary: "Fetch one intake by its local ID",
  security,
  request: { query: GetIntakeByIdValidationSchema },
  responses: jsonResponses(200, "Found", IntakeResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "get",
  path: "/api/intake/get-by-appointment",
  tags: ["Intake"],
  summary: "Fetch the intake linked to a FHIR appointment",
  description: "Doctor-side lookup. Returns null in the body when no intake is linked.",
  security,
  request: { query: GetIntakeByFhirAppointmentIdValidationSchema },
  responses: jsonResponses(200, "Found (or null)", IntakeResponseSchema.nullable()),
});

mobileApiRegistry.registerPath({
  method: "get",
  path: "/api/intake/list",
  tags: ["Intake"],
  summary: "Paginated intake list",
  description: "All filters are optional query params; omitting them returns the full table.",
  security,
  request: { query: ListIntakesValidationSchema },
  responses: jsonResponses(200, "Paginated list", PaginatedIntakeResponseSchema),
});

// ── Consultation ──────────────────────────────────────────────────────────────

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/consultation/create",
  tags: ["Consultation"],
  summary: "Provision a consultation room",
  description:
    "Called immediately after a FHIR appointment is booked. user_id and org_id " +
    "are both always taken from the token — never sent by the client.",
  security,
  request: {
    body: jsonBody(CreateConsultationValidationSchema.omit({ user_id: true, org_id: true })),
  },
  responses: jsonResponses(201, "Created", ConsultationResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/consultation/complete",
  tags: ["Consultation"],
  summary: "Complete a consultation",
  description: "Writes the transcript, SOAP note, and merged full report; flips status to COMPLETED.",
  security,
  request: { body: jsonBody(CompleteConsultationValidationSchema) },
  responses: jsonResponses(200, "Completed", ConsultationResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/consultation/save-clinical-data",
  tags: ["Consultation"],
  summary: "Stage extracted FHIR clinical resources",
  description:
    "Written to by the clinical-extraction-agent right after a consultation ends, and by " +
    "the doctor's Clinical Records workspace autosaving draft edits. published_by is injected " +
    "from the token — the client sends mark_published as intent only.",
  security,
  request: { body: jsonBody(SaveClinicalDataValidationSchema.omit({ published_by: true })) },
  responses: jsonResponses(200, "Saved", ConsultationResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/consultation/abandon",
  tags: ["Consultation"],
  summary: "Abandon a consultation",
  description: "Called when a participant leaves without completing the session.",
  security,
  request: { body: jsonBody(AbandonConsultationValidationSchema) },
  responses: jsonResponses(200, "Abandoned", ConsultationResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "get",
  path: "/api/consultation/get-by-appointment",
  tags: ["Consultation"],
  summary: "Fetch the consultation linked to a FHIR appointment",
  description: "Returns null in the body when no consultation was provisioned (pre-feature bookings).",
  security,
  request: { query: GetConsultationByFhirAppointmentIdValidationSchema },
  responses: jsonResponses(200, "Found (or null)", ConsultationResponseSchema.nullable()),
});

mobileApiRegistry.registerPath({
  method: "get",
  path: "/api/consultation/list",
  tags: ["Consultation"],
  summary: "Paginated consultation list",
  description: "All filters are optional query params; omitting them returns the full table.",
  security,
  request: { query: ListConsultationsValidationSchema },
  responses: jsonResponses(200, "Paginated list", PaginatedConsultationResponseSchema),
});

// ── AI Consultation ───────────────────────────────────────────────────────────

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/ai-consultation/create",
  tags: ["AI Consultation"],
  summary: "Start a new AI consultation session",
  description:
    "Creates a new IN_PROGRESS AI consultation session for the calling (token) user. " +
    "userId and org_id are both always taken from the token — never sent by the client.",
  security,
  request: {
    body: jsonBody(CreateAiConsultationValidationSchema.omit({ userId: true, org_id: true })),
  },
  responses: jsonResponses(201, "Created", AiConsultationResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/ai-consultation/update",
  tags: ["AI Consultation"],
  summary: "Complete an AI consultation session",
  description: "Saves the conversation transcript and AI report, flips status to COMPLETED.",
  security,
  request: { body: jsonBody(UpdateAiConsultationValidationSchema) },
  responses: jsonResponses(200, "Updated", AiConsultationResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/ai-consultation/link",
  tags: ["AI Consultation"],
  summary: "Link a completed AI consultation to a booked follow-up appointment",
  description: "Call immediately after a successful appointment booking when a consultation_id was in the booking flow.",
  security,
  request: { body: jsonBody(LinkAiConsultationValidationSchema) },
  responses: jsonResponses(200, "Linked", AiConsultationResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "post",
  path: "/api/ai-consultation/abandon",
  tags: ["AI Consultation"],
  summary: "Abandon an in-progress AI consultation",
  description: "Called when the patient navigates away without completing.",
  security,
  request: { body: jsonBody(AbandonAiConsultationValidationSchema) },
  responses: jsonResponses(200, "Abandoned", AiConsultationResponseSchema),
});

mobileApiRegistry.registerPath({
  method: "get",
  path: "/api/ai-consultation/get-by-id",
  tags: ["AI Consultation"],
  summary: "Fetch one AI consultation by its local ID",
  security,
  request: { query: GetAiConsultationByIdValidationSchema },
  responses: jsonResponses(200, "Found", AiConsultationResponseSchema),
});
