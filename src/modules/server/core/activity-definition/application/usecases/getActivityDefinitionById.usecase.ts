/**
 * getActivityDefinitionByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: fetch a single ActivityDefinition by ID
 */

import { type TActivityDefinitionResponse } from "@/modules/entities/schemas/activity-definition";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single ActivityDefinition by its public ID.
 *
 * @param id - The fhir-gql public identifier.
 * @returns The matching ActivityDefinition record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getActivityDefinitionByIdUseCase(
  id: number,
): Promise<TActivityDefinitionResponse> {
  const service = getInjection("IActivityDefinitionsService");
  return service.getById(id);
}
