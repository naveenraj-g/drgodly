/**
 * createQuestionnaireUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create Questionnaire
 */

import {
  type TCreateQuestionnaire,
  type TQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new Questionnaire via injected IQuestionnairesService.
 *
 * @param dto - Create payload.
 * @returns The newly created Questionnaire record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createQuestionnaireUseCase(
  dto: TCreateQuestionnaire,
): Promise<TQuestionnaireResponse> {
  const service = getInjection("IQuestionnairesService");
  return service.create(dto);
}
