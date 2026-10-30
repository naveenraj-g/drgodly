/**
 * Preventive-health helpers and schemas for the appointment confirm flow.
 *
 * Layer: entities / schemas / appointment
 *
 * An appointment is a "preventive" visit when one of its `specialty[]` codings
 * is SNOMED 409968004 (Preventive medicine). Those appointments are confirmed
 * together with a PlanDefinition: confirming creates an Encounter, applies the
 * plan ($apply → ServiceRequests) and marks the appointment `fulfilled`.
 *
 * Shared by the client (to switch the confirm modal) and the server (to guard
 * the orchestrating use case), so it only depends on zod + response types.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import { type TAppointmentResponse } from "./response";

/** SNOMED CT code for "Preventive medicine" (the specialty that triggers the plan flow). */
export const PREVENTIVE_MEDICINE_CODE = "409968004";

/**
 * Whether an appointment is a preventive-medicine visit.
 *
 * @param appointment - Appointment (only `specialty[]` is read).
 * @returns true when any specialty coding code is 409968004.
 */
export function isPreventiveAppointment(
  appointment: Pick<TAppointmentResponse, "specialty"> | null | undefined,
): boolean {
  return (
    appointment?.specialty?.some((s) => s.coding_code === PREVENTIVE_MEDICINE_CODE) ?? false
  );
}

/** Input of the confirm-preventive-appointment operation. */
export const ConfirmPreventiveAppointmentValidationSchema = z.object({
  /** Appointment being confirmed. */
  appointment_id: z.number().int().positive(),
  /** PlanDefinition (must be active) whose actions become ServiceRequests. */
  plan_definition_id: z.number().int().positive(),
  /** Injected from the session by the server action — never trusted from the client. */
  org_id: z.string().optional(),
  user_id: z.string().optional(),
});
export type TConfirmPreventiveAppointment = z.infer<
  typeof ConfirmPreventiveAppointmentValidationSchema
>;

/** ZSA envelope (mutating → carries transportOptions for revalidation). */
export const ConfirmPreventiveAppointmentActionSchema = z.object({
  payload: ConfirmPreventiveAppointmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TConfirmPreventiveAppointmentAction = z.infer<
  typeof ConfirmPreventiveAppointmentActionSchema
>;
