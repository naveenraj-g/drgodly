/**
 * TaskCoreRestService — HTTP calls for the Task resource.
 *
 * Layer: server / core / task / infrastructure / services / rest
 *
 * All 5 operations against fhir-gql /tasks. Receives a pre-configured
 * AxiosInstance from the shell (TaskRestApiService) — no auth setup here.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  TaskResponseSchema,
  PaginatedTaskResponseSchema,
  type TTaskResponse,
  type TPaginatedTaskResponse,
  type TCreateTask,
  type TUpdateTaskDto,
  type TListTasksQuery,
} from "@/modules/entities/schemas/task";
import { handleTaskApiError } from "./task.rest.errors";

/** Handles CRUD HTTP calls for Task. Owned by TaskRestApiService shell. */
export class TaskCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /tasks/ — creates a Task.
   * @param dto - `status` and `intent` are required; everything else optional.
   */
  async create(dto: TCreateTask): Promise<TTaskResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "TaskCoreRestService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await TaskResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "TaskCoreRestService.create", startTimeMs, data, context: { operationId, id: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "TaskCoreRestService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleTaskApiError(err);
      throw err;
    }
  }

  /**
   * GET /tasks/ — paginated list with optional filters.
   * @param query - Optional filters.
   */
  async list(query?: TListTasksQuery): Promise<TPaginatedTaskResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "TaskCoreRestService.list", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedTaskResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "TaskCoreRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "TaskCoreRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleTaskApiError(err);
      throw err;
    }
  }

  /**
   * GET /tasks/{id} — single Task by ID.
   * @param id - fhir-gql database ID.
   */
  async getById(id: number): Promise<TTaskResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "TaskCoreRestService.getById", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await TaskResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "TaskCoreRestService.getById", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "TaskCoreRestService.getById", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleTaskApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /tasks/{id} — patches fields (child arrays use REPLACE semantics).
   * @param id - fhir-gql database ID.
   * @param dto - Patch payload.
   */
  async update(id: number, dto: TUpdateTaskDto): Promise<TTaskResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "TaskCoreRestService.update", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await TaskResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "TaskCoreRestService.update", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "TaskCoreRestService.update", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleTaskApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /tasks/{id} — permanently removes a Task.
   * @param id - fhir-gql database ID.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "TaskCoreRestService.delete", startTimeMs, context: { operationId, id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "TaskCoreRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "TaskCoreRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleTaskApiError(err);
      throw err;
    }
  }
}
