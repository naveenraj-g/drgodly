import { TPatientResponse } from "@/modules/entities/schemas/patient/patient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getPatientByIdUseCase(
  id: number
): Promise<TPatientResponse> {
  const patientService = getInjection("IPatientsService");
  return patientService.getById(id);
}
