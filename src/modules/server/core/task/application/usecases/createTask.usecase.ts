/**
 * createTask use case.
 *
 * Layer: server / core / task / application / usecases
 *
 * Resolves ITaskService from DI and delegates the create call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreateTask,
  type TTaskResponse,
} from "@/modules/entities/schemas/task";

/**
 * Creates a new Task via the transport-agnostic ITaskService.
 *
 * @param dto - Validated create payload.
 * @returns The created Task resource.
 */
export async function createTaskUseCase(
  dto: TCreateTask,
): Promise<TTaskResponse> {
  const service = getInjection("ITaskService");
  return service.create(dto);
}
