/**
 * StagingMedicalRecord service interface.
 * Layer: server / core / staging-medical-record / domain
 * Defines the contract that infrastructure implementations must satisfy.
 */
import type {
  TCreateStagingMedicalRecord,
  TUpdateStagingMedicalRecordDto,
  TReviewStagingMedicalRecordDto,
  TListStagingMedicalRecordsQuery,
  TStagingMedicalRecordResponse,
  TPaginatedStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";

export interface IStagingMedicalRecordsService {
  create(
    dto: TCreateStagingMedicalRecord,
  ): Promise<TStagingMedicalRecordResponse>;
  list(
    query?: TListStagingMedicalRecordsQuery,
  ): Promise<TPaginatedStagingMedicalRecordResponse>;
  getById(id: number): Promise<TStagingMedicalRecordResponse>;
  update(
    id: number,
    dto: TUpdateStagingMedicalRecordDto,
  ): Promise<TStagingMedicalRecordResponse>;
  /** Records a clinician's accept/reject/needs-revision decision. */
  review(
    id: number,
    dto: TReviewStagingMedicalRecordDto,
  ): Promise<TStagingMedicalRecordResponse>;
  delete(id: number): Promise<void>;
}
