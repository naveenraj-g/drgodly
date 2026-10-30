/**
 * createQuestionnaireResponseUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create QuestionnaireResponse
 */

import {
  type TCreateQuestionnaireResponse,
  type TQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new QuestionnaireResponse via injected IQuestionnaireResponsesService.
 *
 * @param dto - Create payload.
 * @returns The newly created QuestionnaireResponse record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createQuestionnaireResponseUseCase(
  dto: TCreateQuestionnaireResponse,
): Promise<TQuestionnaireResponseResponse> {
  const service = getInjection("IQuestionnaireResponsesService");
  return service.create(dto);
}
