/**
 * getQuestionnaireByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: fetch a single Questionnaire by ID
 */

import { type TQuestionnaireResponse } from "@/modules/entities/schemas/questionnaire";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single Questionnaire by its public ID.
 *
 * @param id - The fhir-gql public identifier.
 * @returns The matching Questionnaire record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getQuestionnaireByIdUseCase(
  id: number,
): Promise<TQuestionnaireResponse> {
  const service = getInjection("IQuestionnairesService");
  return service.getById(id);
}
