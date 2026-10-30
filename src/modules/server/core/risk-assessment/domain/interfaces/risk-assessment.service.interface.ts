/**
 * IRiskAssessmentsService domain interface.
 *
 * Layer: domain / interfaces
 * Resource: RiskAssessment (FHIR R4)
 *
 * Implemented by RiskAssessmentRestApiService (REST) and RiskAssessmentGraphQLService (GraphQL).
 */

import {
  type TCreateRiskAssessment,
  type TUpdateRiskAssessmentDto,
  type TListRiskAssessmentsQuery,
  type TRiskAssessmentResponse,
  type TPaginatedRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";

export interface IRiskAssessmentsService {
  /**
   * Creates a new RiskAssessment.
   *
   * @param dto - RiskAssessment create payload.
   * @returns Newly created RiskAssessment response.
   */
  create(dto: TCreateRiskAssessment): Promise<TRiskAssessmentResponse>;

  /**
   * Returns a paginated list of RiskAssessments matching query filters.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated RiskAssessments response.
   */
  list(
    query?: TListRiskAssessmentsQuery,
  ): Promise<TPaginatedRiskAssessmentResponse>;

  /**
   * Fetches a RiskAssessment by numeric ID.
   *
   * @param id - Public numeric ID of the RiskAssessment.
   * @returns RiskAssessment record.
   */
  getById(id: number): Promise<TRiskAssessmentResponse>;

  /**
   * Partially updates a RiskAssessment by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Updated RiskAssessment record.
   */
  update(
    id: number,
    dto: TUpdateRiskAssessmentDto,
  ): Promise<TRiskAssessmentResponse>;

  /**
   * Permanently deletes a RiskAssessment by ID.
   *
   * @param id - Public numeric ID.
   */
  delete(id: number): Promise<void>;
}
