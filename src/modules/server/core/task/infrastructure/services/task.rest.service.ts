/**
 * TaskRestApiService — REST transport shell for the Task resource.
 *
 * Layer: server / core / task / infrastructure / services
 *
 * Implements ITaskService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/tasks) and delegating all 5 methods to TaskCoreRestService.
 * No business logic here — only constructor wiring and one-liner delegations.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { ITaskService } from "../../domain/interfaces/task.service.interface";
import { TaskCoreRestService } from "./rest/task.core.rest.service";
import {
  type TTaskResponse,
  type TPaginatedTaskResponse,
  type TCreateTask,
  type TUpdateTaskDto,
  type TListTasksQuery,
} from "@/modules/entities/schemas/task";

/**
 * Thin shell that wires a single AxiosInstance to TaskCoreRestService.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class TaskRestApiService implements ITaskService {
  private readonly core: TaskCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/tasks`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new TaskCoreRestService(client);
  }

  /** @inheritdoc */
  create(dto: TCreateTask): Promise<TTaskResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  list(query?: TListTasksQuery): Promise<TPaginatedTaskResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getById(id: number): Promise<TTaskResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, dto: TUpdateTaskDto): Promise<TTaskResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }
}
