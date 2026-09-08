/**
 * List StagingMedicalRecords use case.
 * Layer: server / core / staging-medical-record / application
 */
import { getInjection } from "@/modules/server/di/container";
import type {
  TListStagingMedicalRecordsQuery,
  TPaginatedStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";

export async function listStagingMedicalRecordsUseCase(
  query?: TListStagingMedicalRecordsQuery,
): Promise<TPaginatedStagingMedicalRecordResponse> {
  const service = getInjection("IStagingMedicalRecordsService");
  return service.list(query);
}
