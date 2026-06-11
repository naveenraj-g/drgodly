import { getInjection } from "@/modules/server/di/container";

export async function deletePatientUseCase(id: number): Promise<void> {
  const patientService = getInjection("IPatientsService");
  return patientService.delete(id);
}
