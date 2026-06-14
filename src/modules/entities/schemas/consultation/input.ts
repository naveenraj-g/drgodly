/**
 * Consultation input / validation schemas.
 *
 * Layer: entities / schemas / consultation
 *
 * Contains all write-side and query Zod schemas for the Consultation resource:
 *   - CreateConsultationValidationSchema   — provision room on booking
 *   - CompleteConsultationValidationSchema — write reports on end-call
 *   - SaveClinicalDataValidationSchema     — write extracted FHIR resources
 *   - AbandonConsultationValidationSchema  — mark as abandoned
 *   - GetConsultationByFhirAppointmentIdValidationSchema — lookup
 */

import { z } from "zod";
import { ConsultationTranscriptMessageSchema, SoapNoteSchema } from "./response";

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Payload for provisioning a virtual room immediately after booking.
 * user_id is NOT included here — it is injected server-side from the
 * authenticated session in the ZSA action handler.
 */
export const CreateConsultationValidationSchema = z.object({
  /** FHIR Appointment.id returned by bookAppointmentAction. */
  fhir_appointment_id: z.number().int().positive(),
  org_id: z.string().optional(),
  /** Better Auth user ID — injected from session, not passed by client. */
  user_id: z.string(),
});
export type TCreateConsultation = z.infer<typeof CreateConsultationValidationSchema>;

// ── Complete ──────────────────────────────────────────────────────────────────

/**
 * Payload for completing a consultation — writes the transcript, SOAP note,
 * and full merged report, then sets status to COMPLETED.
 */
export const CompleteConsultationValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
  /**
   * Transcript from LiveKit transcription. Each entry has speaker, text,
   * and timestamp. Stored as-is for display in the appointment detail view.
   */
  virtual_conversation: z.array(ConsultationTranscriptMessageSchema).optional(),
  /**
   * SOAP note from doctor-report-agent.
   * Shape: { subjective, objective, assessment, plan, summary }
   */
  soap_note: SoapNoteSchema.optional(),
  /**
   * Full merged report from full-report-agent.
   * Shape: { soap_report, assessment_plan, generated_at }
   * Stored as-is — shape accepted without deep structural validation.
   */
  full_report: z.record(z.string(), z.unknown()).optional(),
});
export type TCompleteConsultation = z.infer<typeof CompleteConsultationValidationSchema>;

// ── Save clinical data ────────────────────────────────────────────────────────

/**
 * Payload for writing the FHIR clinical resources extracted from the SOAP note
 * by the clinical-extraction-agent. Written in the post-consultation review step.
 * Accepts unknown[] because the agent returns FHIR R4 objects with variable fields.
 */
export const SaveClinicalDataValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
  service_requests: z.array(z.unknown()).optional(),
  medication_requests: z.array(z.unknown()).optional(),
  observations: z.array(z.unknown()).optional(),
  conditions: z.array(z.unknown()).optional(),
});
export type TSaveClinicalData = z.infer<typeof SaveClinicalDataValidationSchema>;

// ── Abandon ───────────────────────────────────────────────────────────────────

/** Payload for marking a consultation as ABANDONED (patient or doctor left without completing). */
export const AbandonConsultationValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
});
export type TAbandonConsultation = z.infer<typeof AbandonConsultationValidationSchema>;

// ── Read ──────────────────────────────────────────────────────────────────────

/** Schema for fetching a consultation by its linked FHIR appointment ID. */
export const GetConsultationByFhirAppointmentIdValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
});
export type TGetConsultationByFhirAppointmentId = z.infer<
  typeof GetConsultationByFhirAppointmentIdValidationSchema
>;
