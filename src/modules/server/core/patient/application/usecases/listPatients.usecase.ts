import {
  TListPatientsQuery,
  TPaginatedPatientResponse,
} from "@/modules/entities/schemas/patient/patient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function listPatientsUseCase(
  query?: TListPatientsQuery
): Promise<TPaginatedPatientResponse> {
  const patientService = getInjection("IPatientsService");
  return patientService.list(query);
}
