/**
 * listQuestionnaireResponsesUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list QuestionnaireResponses
 */

import {
  type TListQuestionnaireResponsesQuery,
  type TPaginatedQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists QuestionnaireResponses via injected IQuestionnaireResponsesService.
 *
 * @param query - Optional query filters and pagination.
 * @returns Paginated QuestionnaireResponses.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listQuestionnaireResponsesUseCase(
  query?: TListQuestionnaireResponsesQuery,
): Promise<TPaginatedQuestionnaireResponseResponse> {
  const service = getInjection("IQuestionnaireResponsesService");
  return service.list(query);
}
