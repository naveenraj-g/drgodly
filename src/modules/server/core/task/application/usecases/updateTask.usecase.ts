/**
 * updateTask use case.
 *
 * Layer: server / core / task / application / usecases
 *
 * Resolves ITaskService from DI and delegates the update call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TUpdateTaskDto,
  type TTaskResponse,
} from "@/modules/entities/schemas/task";

/**
 * Updates a Task via the transport-agnostic ITaskService.
 *
 * @param id - fhir-gql database ID.
 * @param dto - Patch payload (child arrays use REPLACE semantics).
 * @returns The updated Task resource.
 */
export async function updateTaskUseCase(
  id: number,
  dto: TUpdateTaskDto,
): Promise<TTaskResponse> {
  const service = getInjection("ITaskService");
  return service.update(id, dto);
}
