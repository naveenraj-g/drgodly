/**
 * updateQuestionnaireUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update Questionnaire
 */

import {
  type TUpdateQuestionnaireDto,
  type TQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates an existing Questionnaire.
 *
 * @param id  - Public numeric identifier.
 * @param dto - Patchable fields.
 * @returns The updated Questionnaire record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateQuestionnaireUseCase(
  id: number,
  dto: TUpdateQuestionnaireDto,
): Promise<TQuestionnaireResponse> {
  const service = getInjection("IQuestionnairesService");
  return service.update(id, dto);
}
