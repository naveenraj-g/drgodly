/**
 * PlanDefinitionRestApiService — REST transport implementation of IPlanDefinitionsService.
 *
 * Layer: infrastructure / services
 * Resource: PlanDefinition (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for PlanDefinition CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see plan-definition.graphql.service.ts.
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  PlanDefinitionResponseSchema,
  PaginatedPlanDefinitionResponseSchema,
  type TCreatePlanDefinition,
  type TPatchPlanDefinitionDto,
  type TListPlanDefinitionsQuery,
  type TPlanDefinitionResponse,
  type TPaginatedPlanDefinitionResponse,
  type TApplyPlanDefinitionDto,
} from "@/modules/entities/schemas/plan-definition";
import {
  ApplyDefinitionResponseSchema,
  type TApplyDefinitionResponse,
} from "@/modules/entities/schemas/definition-apply";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  BadGatewayError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/modules/server/shared/errors/commonErrors";
import { IPlanDefinitionsService } from "../../domain/interfaces/plan-definition.service.interface";

export class PlanDefinitionRestApiService implements IPlanDefinitionsService {
  /** Axios instance scoped to the fhir-gql /plan-definitions base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/plan-definitions`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Maps an AxiosError from the fhir-gql API to the appropriate domain error and throws it.
   * Always throws — return type `never`.
   *
   * @param error - Axios error encountered during request execution.
   * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | ConflictError | RateLimitError | BadGatewayError
   */
  private handleError(error: AxiosError): never {
    const body = error.response?.data as Record<string, unknown> | undefined;
    const message =
      typeof body?.detail === "string"
        ? body.detail
        : (error.response?.statusText ?? error.message);

    switch (error.response?.status) {
      case 400:
        throw new ValidationError(message);
      case 401:
        throw new UnauthorizedError(message);
      case 403:
        throw new ForbiddenError(message);
      case 404:
        throw new NotFoundError(message);
      case 409:
        throw new ConflictError(message);
      // 422 = fhir-gql (FastAPI) request validation failure, e.g. unknown selected_actions id.
      case 422:
        throw new ValidationError(message);
      case 429:
        throw new RateLimitError(message);
      default:
        throw new BadGatewayError(
          `fhir-gql error ${error.response?.status ?? "unknown"}: ${message}`,
        );
    }
  }

  /**
   * Creates a new PlanDefinition.
   *
   * @param dto - PlanDefinition create data.
   * @returns The newly created PlanDefinition record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreatePlanDefinition): Promise<TPlanDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PlanDefinitionRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await PlanDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PlanDefinitionRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, planDefinitionId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PlanDefinitionRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of PlanDefinitions with optional server-side filtering.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated result: { total, limit, offset, data: TPlanDefinitionResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListPlanDefinitionsQuery): Promise<TPaginatedPlanDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PlanDefinitionRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          org_id: query?.org_id,
          _id: query?.id,
          identifier: query?.identifier,
          url: query?.url,
          version: query?.version,
          name: query?.name,
          title: query?.title,
          publisher: query?.publisher,
          description: query?.description,
          status: query?.status,
          type: query?.type,
          topic: query?.topic,
          jurisdiction: query?.jurisdiction,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedPlanDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PlanDefinitionRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PlanDefinitionRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single PlanDefinition by its public fhir-gql ID.
   *
   * @param id - The fhir-gql public identifier.
   * @returns The matching PlanDefinition record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TPlanDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PlanDefinitionRestApiService.getById",
      startTimeMs,
      context: { operationId, planDefinitionId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await PlanDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PlanDefinitionRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, planDefinitionId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PlanDefinitionRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, planDefinitionId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a PlanDefinition.
   *
   * @param id  - The fhir-gql public identifier.
   * @param dto - Patchable fields.
   * @returns The updated PlanDefinition record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TPatchPlanDefinitionDto): Promise<TPlanDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PlanDefinitionRestApiService.update",
      startTimeMs,
      context: { operationId, planDefinitionId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await PlanDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PlanDefinitionRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, planDefinitionId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PlanDefinitionRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, planDefinitionId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a PlanDefinition.
   *
   * @param id - The fhir-gql public identifier.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PlanDefinitionRestApiService.delete",
      startTimeMs,
      context: { operationId, planDefinitionId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "PlanDefinitionRestApiService.delete",
        startTimeMs,
        context: { operationId, planDefinitionId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "PlanDefinitionRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, planDefinitionId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Applies the PlanDefinition to a subject (FHIR `$apply`) — generates ServiceRequests.
   * `persist=false` (default) previews only; `persist=true` saves them in one transaction.
   *
   * @param id  - The fhir-gql public identifier.
   * @param dto - Apply body (subject, encounter, practitioner, persist, ...).
   * @returns Generated ServiceRequests plus the actions that were skipped.
   * @throws ValidationError | NotFoundError | UnauthorizedError | ForbiddenError | BadGatewayError
   */
  async apply(id: number, dto: TApplyPlanDefinitionDto): Promise<TApplyDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PlanDefinitionRestApiService.apply",
      startTimeMs,
      context: { operationId, planDefinitionId: id, persist: dto.persist ?? false },
    });

    try {
      // "$apply" is a literal path segment of the FHIR operation, not a template variable.
      const res = await this.client.post<unknown>(`/${id}/$apply`, dto);
      const data = await ApplyDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PlanDefinitionRestApiService.apply",
        startTimeMs,
        data,
        context: { operationId, planDefinitionId: id, total: data.total, persisted: data.persisted },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PlanDefinitionRestApiService.apply",
        startTimeMs,
        err,
        context: { operationId, planDefinitionId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
