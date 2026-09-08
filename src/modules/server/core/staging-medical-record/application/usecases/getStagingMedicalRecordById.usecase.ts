/**
 * Get StagingMedicalRecord by id use case.
 * Layer: server / core / staging-medical-record / application
 */
import { getInjection } from "@/modules/server/di/container";
import type { TStagingMedicalRecordResponse } from "@/modules/entities/schemas/staging-medical-record";

export async function getStagingMedicalRecordByIdUseCase(
  id: number,
): Promise<TStagingMedicalRecordResponse> {
  const service = getInjection("IStagingMedicalRecordsService");
  return service.getById(id);
}
