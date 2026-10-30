/**
 * Task service domain interface.
 *
 * Layer: server / core / task / domain
 */

import type {
  TCreateTask,
  TUpdateTaskDto,
  TListTasksQuery,
  TTaskResponse,
  TPaginatedTaskResponse,
} from "@/modules/entities/schemas/task";

/**
 * Service contract for Task CRUD operations.
 * Injected via IoC as `ITaskService`.
 */
export interface ITaskService {
  /**
   * Creates a new Task.
   * @param dto - Create payload; `status` and `intent` are required.
   */
  create(dto: TCreateTask): Promise<TTaskResponse>;

  /**
   * Returns a paginated list of Tasks with optional filters.
   * @param query - Filters (status, intent, patient, owner, requester, etc.).
   */
  list(query?: TListTasksQuery): Promise<TPaginatedTaskResponse>;

  /**
   * Fetches a single Task by its integer ID.
   * @param id - fhir-gql database ID.
   */
  getById(id: number): Promise<TTaskResponse>;

  /**
   * Partially updates a Task. Child arrays use REPLACE semantics.
   * @param id - fhir-gql database ID.
   * @param dto - Patch payload.
   */
  update(id: number, dto: TUpdateTaskDto): Promise<TTaskResponse>;

  /**
   * Permanently deletes a Task.
   * @param id - fhir-gql database ID.
   */
  delete(id: number): Promise<void>;
}
