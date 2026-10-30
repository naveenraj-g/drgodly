/**
 * deleteQuestionnaireUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete Questionnaire
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes a Questionnaire by public ID.
 *
 * @param id - Public numeric identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteQuestionnaireUseCase(id: number): Promise<void> {
  const service = getInjection("IQuestionnairesService");
  return service.delete(id);
}
