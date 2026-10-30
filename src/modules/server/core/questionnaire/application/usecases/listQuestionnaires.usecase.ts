/**
 * listQuestionnairesUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list Questionnaires
 */

import {
  type TListQuestionnairesQuery,
  type TPaginatedQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists Questionnaires matching query filters.
 *
 * @param query - Optional search/filter parameters.
 * @returns Paginated Questionnaires response.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listQuestionnairesUseCase(
  query?: TListQuestionnairesQuery,
): Promise<TPaginatedQuestionnaireResponse> {
  const service = getInjection("IQuestionnairesService");
  return service.list(query);
}
