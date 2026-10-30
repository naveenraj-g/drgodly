/**
 * IQuestionnaireResponsesService domain interface.
 *
 * Layer: domain / interfaces
 * Resource: QuestionnaireResponse (FHIR R4)
 *
 * Implemented by QuestionnaireResponseRestApiService (REST) and QuestionnaireResponseGraphQLService (GraphQL).
 */

import {
  type TCreateQuestionnaireResponse,
  type TUpdateQuestionnaireResponseDto,
  type TListQuestionnaireResponsesQuery,
  type TQuestionnaireResponseResponse,
  type TPaginatedQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";

export interface IQuestionnaireResponsesService {
  /**
   * Records answers to a Questionnaire as a new QuestionnaireResponse.
   *
   * @param dto - QuestionnaireResponse create payload.
   * @returns Newly created QuestionnaireResponse response.
   */
  create(
    dto: TCreateQuestionnaireResponse,
  ): Promise<TQuestionnaireResponseResponse>;

  /**
   * Returns a paginated list of QuestionnaireResponses matching query filters.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated QuestionnaireResponses response.
   */
  list(
    query?: TListQuestionnaireResponsesQuery,
  ): Promise<TPaginatedQuestionnaireResponseResponse>;

  /**
   * Fetches a QuestionnaireResponse by numeric ID.
   *
   * @param id - Public numeric ID of the QuestionnaireResponse.
   * @returns QuestionnaireResponse record.
   */
  getById(id: number): Promise<TQuestionnaireResponseResponse>;

  /**
   * Partially updates a QuestionnaireResponse by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Updated QuestionnaireResponse record.
   */
  update(
    id: number,
    dto: TUpdateQuestionnaireResponseDto,
  ): Promise<TQuestionnaireResponseResponse>;

  /**
   * Permanently deletes a QuestionnaireResponse by ID.
   *
   * @param id - Public numeric ID.
   */
  delete(id: number): Promise<void>;
}
