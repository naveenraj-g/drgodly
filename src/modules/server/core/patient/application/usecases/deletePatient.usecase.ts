import { getInjection } from "@/modules/server/di/container";

export async function deletePatientUseCase(id: number): Promise<void> {
  const patientService = getInjection("IPatientService");
  return patientService.delete(id);
}
