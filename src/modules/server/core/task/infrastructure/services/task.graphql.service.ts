/**
 * TaskGraphQLService — GraphQL transport stub for ITaskService.
 *
 * Layer: server / core / task / infrastructure / services
 *
 * Not yet implemented. Bound by the DI module when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use TaskRestApiService instead.
 */

import { ITaskService } from "../../domain/interfaces/task.service.interface";
import {
  type TTaskResponse,
  type TPaginatedTaskResponse,
  type TCreateTask,
  type TUpdateTaskDto,
  type TListTasksQuery,
} from "@/modules/entities/schemas/task";

/**
 * Placeholder implementation — all methods throw until GraphQL is wired.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
export class TaskGraphQLService implements ITaskService {
  /** @throws Always — not implemented. */
  async create(_dto: TCreateTask): Promise<TTaskResponse> {
    throw new Error(
      "TaskGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async list(_query?: TListTasksQuery): Promise<TPaginatedTaskResponse> {
    throw new Error(
      "TaskGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async getById(_id: number): Promise<TTaskResponse> {
    throw new Error(
      "TaskGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async update(_id: number, _dto: TUpdateTaskDto): Promise<TTaskResponse> {
    throw new Error(
      "TaskGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "TaskGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
