/**
 * ActivityDefinitionRestApiService — REST transport implementation of IActivityDefinitionsService.
 *
 * Layer: infrastructure / services
 * Resource: ActivityDefinition (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for ActivityDefinition CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see activity-definition.graphql.service.ts.
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  ActivityDefinitionResponseSchema,
  PaginatedActivityDefinitionResponseSchema,
  type TCreateActivityDefinition,
  type TPatchActivityDefinitionDto,
  type TListActivityDefinitionsQuery,
  type TActivityDefinitionResponse,
  type TPaginatedActivityDefinitionResponse,
  type TApplyActivityDefinitionDto,
} from "@/modules/entities/schemas/activity-definition";
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
import { IActivityDefinitionsService } from "../../domain/interfaces/activity-definition.service.interface";

export class ActivityDefinitionRestApiService
  implements IActivityDefinitionsService
{
  /** Axios instance scoped to the fhir-gql /activity-definitions base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/activity-definitions`,
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
   * Creates a new ActivityDefinition.
   *
   * @param dto - ActivityDefinition create data.
   * @returns The newly created ActivityDefinition record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(
    dto: TCreateActivityDefinition,
  ): Promise<TActivityDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ActivityDefinitionRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await ActivityDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ActivityDefinitionRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, activityDefinitionId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ActivityDefinitionRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of ActivityDefinitions with optional server-side filtering.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated result: { total, limit, offset, data: TActivityDefinitionResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(
    query?: TListActivityDefinitionsQuery,
  ): Promise<TPaginatedActivityDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ActivityDefinitionRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          org_id: query?.org_id,
          user_id: query?.user_id,
          _id: query?.id,
          identifier: query?.identifier,
          url: query?.url,
          version: query?.version,
          name: query?.name,
          "name:contains": query?.name_contains,
          "name:exact": query?.name_exact,
          title: query?.title,
          "title:contains": query?.title_contains,
          "title:exact": query?.title_exact,
          publisher: query?.publisher,
          "publisher:contains": query?.publisher_contains,
          "publisher:exact": query?.publisher_exact,
          description: query?.description,
          "description:contains": query?.description_contains,
          "description:exact": query?.description_exact,
          status: query?.status,
          topic: query?.topic,
          jurisdiction: query?.jurisdiction,
          context: query?.context,
          "context-type": query?.context_type,
          "depends-on": query?.depends_on,
          "derived-from": query?.derived_from,
          predecessor: query?.predecessor,
          successor: query?.successor,
          "composed-of": query?.composed_of,
          date: query?.date,
          effective: query?.effective,
          _lastUpdated: query?.last_updated,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });

      const data =
        await PaginatedActivityDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ActivityDefinitionRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ActivityDefinitionRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single ActivityDefinition by its public fhir-gql ID.
   *
   * @param id - The fhir-gql public identifier.
   * @returns The matching ActivityDefinition record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TActivityDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ActivityDefinitionRestApiService.getById",
      startTimeMs,
      context: { operationId, activityDefinitionId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await ActivityDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ActivityDefinitionRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, activityDefinitionId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ActivityDefinitionRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, activityDefinitionId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates an ActivityDefinition.
   *
   * @param id  - The fhir-gql public identifier.
   * @param dto - Patchable fields.
   * @returns The updated ActivityDefinition record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(
    id: number,
    dto: TPatchActivityDefinitionDto,
  ): Promise<TActivityDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ActivityDefinitionRestApiService.update",
      startTimeMs,
      context: { operationId, activityDefinitionId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await ActivityDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ActivityDefinitionRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, activityDefinitionId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ActivityDefinitionRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, activityDefinitionId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes an ActivityDefinition.
   *
   * @param id - The fhir-gql public identifier.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ActivityDefinitionRestApiService.delete",
      startTimeMs,
      context: { operationId, activityDefinitionId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "ActivityDefinitionRestApiService.delete",
        startTimeMs,
        context: { operationId, activityDefinitionId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "ActivityDefinitionRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, activityDefinitionId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Applies the ActivityDefinition to a subject (FHIR `$apply`) — generates ServiceRequests.
   * `persist=false` (default) previews only; `persist=true` saves them in one transaction.
   *
   * @param id  - The fhir-gql public identifier.
   * @param dto - Apply body (subject, encounter, practitioner, persist, ...).
   * @returns Generated ServiceRequests plus the actions that were skipped.
   * @throws ValidationError | NotFoundError | UnauthorizedError | ForbiddenError | BadGatewayError
   */
  async apply(id: number, dto: TApplyActivityDefinitionDto): Promise<TApplyDefinitionResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ActivityDefinitionRestApiService.apply",
      startTimeMs,
      context: { operationId, activityDefinitionId: id, persist: dto.persist ?? false },
    });

    try {
      // "$apply" is a literal path segment of the FHIR operation, not a template variable.
      const res = await this.client.post<unknown>(`/${id}/$apply`, dto);
      const data = await ApplyDefinitionResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ActivityDefinitionRestApiService.apply",
        startTimeMs,
        data,
        context: { operationId, activityDefinitionId: id, total: data.total, persisted: data.persisted },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ActivityDefinitionRestApiService.apply",
        startTimeMs,
        err,
        context: { operationId, activityDefinitionId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
