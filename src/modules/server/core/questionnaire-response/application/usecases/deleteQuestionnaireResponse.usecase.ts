/**
 * deleteQuestionnaireResponseUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete QuestionnaireResponse
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes a QuestionnaireResponse by ID via injected IQuestionnaireResponsesService.
 *
 * @param id - Public numeric ID.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteQuestionnaireResponseUseCase(
  id: number,
): Promise<void> {
  const service = getInjection("IQuestionnaireResponsesService");
  return service.delete(id);
}
