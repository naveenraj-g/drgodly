/**
 * Intake response schemas.
 *
 * Layer: entities / schemas / intake
 *
 * Mirrors the local Prisma Intake model shape. All fields that can be null
 * in Postgres use .nullable() — the Prisma client returns null (never undefined)
 * for optional columns.
 */

import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

/** The channel through which the intake was conducted. */
export const IntakeModeSchema = z.enum(["TEXT", "VOICE"]);
export type TIntakeMode = z.infer<typeof IntakeModeSchema>;

/** Lifecycle status of a patient intake session. */
export const IntakeStatusSchema = z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]);
export type TIntakeStatus = z.infer<typeof IntakeStatusSchema>;

// ── Conversation message schema ───────────────────────────────────────────────

/** Single turn in the intake conversation transcript. */
export const IntakeMessageSchema = z.object({
  /** "user" for patient messages, "assistant" for AI responses. */
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type TIntakeMessage = z.infer<typeof IntakeMessageSchema>;

// ── AI report schema ─────────────────────────────────────────────────────────

/**
 * AI-generated clinical assessment report.
 * Shape mirrors the /api/assessment-plan-agent response.
 */
export const IntakeReportSchema = z.object({
  clinical_overview: z.string().optional(),
  risk_level: z.string().optional(),
  differential_diagnosis: z.array(z.string()).optional(),
  diagnostic_plan: z.string().optional(),
  treatment_plan: z.string().optional(),
  red_flags: z.array(z.string()).optional(),
}).passthrough();
export type TIntakeReport = z.infer<typeof IntakeReportSchema>;

// ── Top-level response ────────────────────────────────────────────────────────

/**
 * Full Intake record as returned from the local database.
 * Matches the Prisma Intake model with enums converted to string literals.
 */
export const IntakeResponseSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  org_id: z.string().nullable(),
  patient_fhir_id: z.number().nullable(),
  mode: IntakeModeSchema,
  status: IntakeStatusSchema,
  conversation: z.array(IntakeMessageSchema).nullable(),
  report: IntakeReportSchema.nullable(),
  fhir_appointment_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TIntakeResponse = z.infer<typeof IntakeResponseSchema>;
