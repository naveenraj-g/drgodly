/**
 * IQuestionnairesService domain interface.
 *
 * Layer: domain / interfaces
 * Resource: Questionnaire (FHIR R4)
 *
 * Implemented by QuestionnaireRestApiService (REST) and QuestionnaireGraphQLService (GraphQL).
 */

import {
  type TCreateQuestionnaire,
  type TUpdateQuestionnaireDto,
  type TListQuestionnairesQuery,
  type TQuestionnaireResponse,
  type TPaginatedQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";

export interface IQuestionnairesService {
  /**
   * Creates a new Questionnaire.
   *
   * @param dto - Questionnaire create payload.
   * @returns Newly created Questionnaire response.
   */
  create(dto: TCreateQuestionnaire): Promise<TQuestionnaireResponse>;

  /**
   * Returns a paginated list of Questionnaires matching query filters.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated Questionnaires response.
   */
  list(query?: TListQuestionnairesQuery): Promise<TPaginatedQuestionnaireResponse>;

  /**
   * Fetches a Questionnaire by numeric ID.
   *
   * @param id - Public numeric ID of the Questionnaire.
   * @returns Questionnaire record.
   */
  getById(id: number): Promise<TQuestionnaireResponse>;

  /**
   * Partially updates a Questionnaire by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Updated Questionnaire record.
   */
  update(id: number, dto: TUpdateQuestionnaireDto): Promise<TQuestionnaireResponse>;

  /**
   * Permanently deletes a Questionnaire.
   *
   * @param id - Public numeric ID.
   */
  delete(id: number): Promise<void>;
}
