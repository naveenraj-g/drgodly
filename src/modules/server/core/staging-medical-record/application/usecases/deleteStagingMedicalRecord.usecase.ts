/**
 * Delete StagingMedicalRecord use case.
 * Layer: server / core / staging-medical-record / application
 */
import { getInjection } from "@/modules/server/di/container";

export async function deleteStagingMedicalRecordUseCase(
  id: number,
): Promise<void> {
  const service = getInjection("IStagingMedicalRecordsService");
  return service.delete(id);
}
