import {
  TPatientResponse,
  TRegisterPatient,
} from "@/modules/entities/schemas/patient/patient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function registerPatientUseCase(
  dto: TRegisterPatient
): Promise<TPatientResponse> {
  const patientService = getInjection("IPatientService");
  return patientService.register(dto);
}
