/**
 * updateQuestionnaireResponseUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update QuestionnaireResponse
 */

import {
  type TUpdateQuestionnaireResponseDto,
  type TQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
import { getInjection } from "@/modules/server/di/container";

/**
 * Updates a QuestionnaireResponse by ID via injected IQuestionnaireResponsesService.
 *
 * @param id - Public numeric ID.
 * @param dto - Fields to patch.
 * @returns Updated QuestionnaireResponse record.
 * @throws NotFoundError | ValidationError | UnauthorizedError | BadGatewayError
 */
export async function updateQuestionnaireResponseUseCase(
  id: number,
  dto: TUpdateQuestionnaireResponseDto,
): Promise<TQuestionnaireResponseResponse> {
  const service = getInjection("IQuestionnaireResponsesService");
  return service.update(id, dto);
}
