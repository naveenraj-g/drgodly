/**
 * Review StagingMedicalRecord use case — records a clinician's accept/reject
 * decision on a staging record's AI-extracted data.
 * Layer: server / core / staging-medical-record / application
 */
import { getInjection } from "@/modules/server/di/container";
import type {
  TReviewStagingMedicalRecordDto,
  TStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";

export async function reviewStagingMedicalRecordUseCase(
  id: number,
  dto: TReviewStagingMedicalRecordDto,
): Promise<TStagingMedicalRecordResponse> {
  const service = getInjection("IStagingMedicalRecordsService");
  return service.review(id, dto);
}
