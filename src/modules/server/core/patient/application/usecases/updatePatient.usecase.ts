import {
  TPatientResponse,
  TUpdatePatientDto,
} from "@/modules/entities/schemas/patient/patient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updatePatientUseCase(
  id: number,
  dto: TUpdatePatientDto
): Promise<TPatientResponse> {
  const patientService = getInjection("IPatientsService");
  return patientService.update(id, dto);
}
