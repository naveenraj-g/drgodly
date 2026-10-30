/**
 * deleteTask use case.
 *
 * Layer: server / core / task / application / usecases
 *
 * Resolves ITaskService from DI and delegates the delete call.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a Task via the transport-agnostic ITaskService.
 *
 * @param id - fhir-gql database ID.
 */
export async function deleteTaskUseCase(id: number): Promise<void> {
  const service = getInjection("ITaskService");
  return service.delete(id);
}
