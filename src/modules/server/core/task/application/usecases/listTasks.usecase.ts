/**
 * listTasks use case.
 *
 * Layer: server / core / task / application / usecases
 *
 * Resolves ITaskService from DI and delegates the list call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListTasksQuery,
  type TPaginatedTaskResponse,
} from "@/modules/entities/schemas/task";

/**
 * Lists Tasks via the transport-agnostic ITaskService.
 *
 * @param query - Optional filters and pagination.
 * @returns Paginated Task list.
 */
export async function listTasksUseCase(
  query?: TListTasksQuery,
): Promise<TPaginatedTaskResponse> {
  const service = getInjection("ITaskService");
  return service.list(query);
}
