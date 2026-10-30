/**
 * getPlanDefinitionByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: fetch a single PlanDefinition by its public ID
 */

import { type TPlanDefinitionResponse } from "@/modules/entities/schemas/plan-definition";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single PlanDefinition by its public identifier.
 *
 * @param id - The fhir-gql public identifier.
 * @returns The matching PlanDefinition record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getPlanDefinitionByIdUseCase(
  id: number,
): Promise<TPlanDefinitionResponse> {
  const service = getInjection("IPlanDefinitionsService");
  return service.getById(id);
}
