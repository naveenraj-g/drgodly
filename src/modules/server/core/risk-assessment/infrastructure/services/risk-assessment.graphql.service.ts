/**
 * RiskAssessmentGraphQLService — GraphQL transport stub for IRiskAssessmentsService.
 *
 * Layer: infrastructure / services
 * Resource: RiskAssessment (FHIR R4)
 * Transport: GraphQL
 *
 * Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the active REST implementation.
 */

import {
  type TCreateRiskAssessment,
  type TUpdateRiskAssessmentDto,
  type TListRiskAssessmentsQuery,
  type TRiskAssessmentResponse,
  type TPaginatedRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
import { IRiskAssessmentsService } from "../../domain/interfaces/risk-assessment.service.interface";

export class RiskAssessmentGraphQLService implements IRiskAssessmentsService {
  async create(_dto: TCreateRiskAssessment): Promise<TRiskAssessmentResponse> {
    throw new Error(
      "RiskAssessmentGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async list(
    _query?: TListRiskAssessmentsQuery,
  ): Promise<TPaginatedRiskAssessmentResponse> {
    throw new Error(
      "RiskAssessmentGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async getById(_id: number): Promise<TRiskAssessmentResponse> {
    throw new Error(
      "RiskAssessmentGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async update(
    _id: number,
    _dto: TUpdateRiskAssessmentDto,
  ): Promise<TRiskAssessmentResponse> {
    throw new Error(
      "RiskAssessmentGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async delete(_id: number): Promise<void> {
    throw new Error(
      "RiskAssessmentGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
