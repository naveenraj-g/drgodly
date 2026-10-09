/**
 * getIntakeByFhirAppointmentId use case.
 *
 * Layer: server / core / intake / application
 *
 * Doctor-side lookup: retrieves the intake session linked to a FHIR appointment.
 * Returns null when the appointment was booked without a prior intake.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";

/**
 * @param fhirAppointmentId - FHIR Appointment.id (integer).
 * @param orgId - When supplied, a row belonging to a different org is treated as not found.
 * @returns Linked Intake or null.
 */
export async function getIntakeByFhirAppointmentIdUseCase(
  fhirAppointmentId: number,
  orgId?: string,
): Promise<TIntakeResponse | null> {
  const repo = getInjection("IIntakeRepository");
  return repo.getByFhirAppointmentId(fhirAppointmentId, orgId);
}
