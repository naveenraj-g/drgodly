/**
 * getQuestionnaireResponseByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: get QuestionnaireResponse by ID
 */

import { type TQuestionnaireResponseResponse } from "@/modules/entities/schemas/questionnaire-response";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single QuestionnaireResponse by ID via injected IQuestionnaireResponsesService.
 *
 * @param id - Public numeric ID.
 * @returns QuestionnaireResponse record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getQuestionnaireResponseByIdUseCase(
  id: number,
): Promise<TQuestionnaireResponseResponse> {
  const service = getInjection("IQuestionnaireResponsesService");
  return service.getById(id);
}
