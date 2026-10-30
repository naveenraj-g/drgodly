/**
 * deleteActivityDefinitionUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete ActivityDefinition
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes an ActivityDefinition by public ID.
 *
 * @param id - Public numeric identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteActivityDefinitionUseCase(id: number): Promise<void> {
  const service = getInjection("IActivityDefinitionsService");
  return service.delete(id);
}
