/**
 * Update StagingMedicalRecord use case.
 * Layer: server / core / staging-medical-record / application
 */
import { getInjection } from "@/modules/server/di/container";
import type {
  TUpdateStagingMedicalRecordDto,
  TStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";

export async function updateStagingMedicalRecordUseCase(
  id: number,
  dto: TUpdateStagingMedicalRecordDto,
): Promise<TStagingMedicalRecordResponse> {
  const service = getInjection("IStagingMedicalRecordsService");
  return service.update(id, dto);
}
