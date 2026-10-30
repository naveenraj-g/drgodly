/**
 * deletePlanDefinitionUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete PlanDefinition
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes a PlanDefinition by its public ID.
 *
 * @param id - Public numeric identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deletePlanDefinitionUseCase(id: number): Promise<void> {
  const service = getInjection("IPlanDefinitionsService");
  return service.delete(id);
}
