/**
 * getTaskById use case.
 *
 * Layer: server / core / task / application / usecases
 *
 * Resolves ITaskService from DI and delegates the getById call.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TTaskResponse } from "@/modules/entities/schemas/task";

/**
 * Fetches a single Task via the transport-agnostic ITaskService.
 *
 * @param id - fhir-gql database ID.
 * @returns The Task resource.
 */
export async function getTaskByIdUseCase(id: number): Promise<TTaskResponse> {
  const service = getInjection("ITaskService");
  return service.getById(id);
}
