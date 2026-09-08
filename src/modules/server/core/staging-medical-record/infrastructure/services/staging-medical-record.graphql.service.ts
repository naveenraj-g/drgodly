/**
 * StagingMedicalRecordGraphQLService — GraphQL transport stub for
 * IStagingMedicalRecordsService.
 * Layer: server / core / staging-medical-record / infrastructure
 * Not yet implemented. Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the REST implementation — the
 * staging-area service does not expose GraphQL at all.
 */
import { IStagingMedicalRecordsService } from "../../domain/interfaces/staging-medical-record.service.interface";
import type {
  TCreateStagingMedicalRecord,
  TUpdateStagingMedicalRecordDto,
  TReviewStagingMedicalRecordDto,
  TListStagingMedicalRecordsQuery,
  TStagingMedicalRecordResponse,
  TPaginatedStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";

export class StagingMedicalRecordGraphQLService
  implements IStagingMedicalRecordsService
{
  async create(
    _dto: TCreateStagingMedicalRecord,
  ): Promise<TStagingMedicalRecordResponse> {
    throw new Error(
      "StagingMedicalRecordGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
  async list(
    _query?: TListStagingMedicalRecordsQuery,
  ): Promise<TPaginatedStagingMedicalRecordResponse> {
    throw new Error(
      "StagingMedicalRecordGraphQLService.list is not yet implemented.",
    );
  }
  async getById(_id: number): Promise<TStagingMedicalRecordResponse> {
    throw new Error(
      "StagingMedicalRecordGraphQLService.getById is not yet implemented.",
    );
  }
  async update(
    _id: number,
    _dto: TUpdateStagingMedicalRecordDto,
  ): Promise<TStagingMedicalRecordResponse> {
    throw new Error(
      "StagingMedicalRecordGraphQLService.update is not yet implemented.",
    );
  }
  async review(
    _id: number,
    _dto: TReviewStagingMedicalRecordDto,
  ): Promise<TStagingMedicalRecordResponse> {
    throw new Error(
      "StagingMedicalRecordGraphQLService.review is not yet implemented.",
    );
  }
  async delete(_id: number): Promise<void> {
    throw new Error(
      "StagingMedicalRecordGraphQLService.delete is not yet implemented.",
    );
  }
}
