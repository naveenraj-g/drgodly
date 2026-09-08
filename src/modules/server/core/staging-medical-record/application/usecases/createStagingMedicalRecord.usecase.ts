/**
 * Create StagingMedicalRecord use case.
 * Layer: server / core / staging-medical-record / application
 */
import { getInjection } from "@/modules/server/di/container";
import type {
  TCreateStagingMedicalRecord,
  TStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";

export async function createStagingMedicalRecordUseCase(
  dto: TCreateStagingMedicalRecord,
): Promise<TStagingMedicalRecordResponse> {
  const service = getInjection("IStagingMedicalRecordsService");
  return service.create(dto);
}
