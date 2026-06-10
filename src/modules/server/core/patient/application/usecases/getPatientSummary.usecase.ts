import { TPatientSummary } from "@/modules/entities/schemas/patient/patient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getPatientSummaryUseCase(
  id: number
): Promise<TPatientSummary> {
  const patientService = getInjection("IPatientService");
  return patientService.getSummary(id);
}
