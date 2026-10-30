/**
 * QuestionnaireResponseRestApiService — REST transport implementation of IQuestionnaireResponsesService.
 *
 * Layer: infrastructure / services
 * Resource: QuestionnaireResponse (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for QuestionnaireResponse CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see questionnaire-response.graphql.service.ts.
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  QuestionnaireResponseResponseSchema,
  PaginatedQuestionnaireResponseResponseSchema,
  type TCreateQuestionnaireResponse,
  type TUpdateQuestionnaireResponseDto,
  type TListQuestionnaireResponsesQuery,
  type TQuestionnaireResponseResponse,
  type TPaginatedQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
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
import { IQuestionnaireResponsesService } from "../../domain/interfaces/questionnaire-response.service.interface";

export class QuestionnaireResponseRestApiService
  implements IQuestionnaireResponsesService
{
  /** Axios instance scoped to the fhir-gql /questionnaire-responses base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/questionnaire-responses`,
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
      case 429:
        throw new RateLimitError(message);
      default:
        throw new BadGatewayError(
          `fhir-gql error ${error.response?.status ?? "unknown"}: ${message}`,
        );
    }
  }

  /**
   * Records answers to a Questionnaire as a new QuestionnaireResponse.
   *
   * @param dto - QuestionnaireResponse create payload.
   * @returns Validated QuestionnaireResponse response.
   */
  async create(
    dto: TCreateQuestionnaireResponse,
  ): Promise<TQuestionnaireResponseResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireResponseRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const response = await this.client.post("/", dto);
      const data = await QuestionnaireResponseResponseSchema.parseAsync(
        response.data,
      );
      logOperation("success", {
        name: "QuestionnaireResponseRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, id: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireResponseRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of QuestionnaireResponses matching query filters.
   *
   * @param query - Optional search/filter parameters.
   * @returns Validated paginated QuestionnaireResponses response.
   */
  async list(
    query?: TListQuestionnaireResponsesQuery,
  ): Promise<TPaginatedQuestionnaireResponseResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireResponseRestApiService.list",
      startTimeMs,
      context: { operationId, query },
    });

    try {
      const response = await this.client.get("/", { params: query });
      const data =
        await PaginatedQuestionnaireResponseResponseSchema.parseAsync(
          response.data,
        );
      logOperation("success", {
        name: "QuestionnaireResponseRestApiService.list",
        startTimeMs,
        data,
        context: { operationId, total: data.total },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireResponseRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a QuestionnaireResponse by ID.
   *
   * @param id - Public numeric ID.
   * @returns Validated QuestionnaireResponse record.
   */
  async getById(id: number): Promise<TQuestionnaireResponseResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireResponseRestApiService.getById",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      const response = await this.client.get(`/${id}`);
      const data = await QuestionnaireResponseResponseSchema.parseAsync(
        response.data,
      );
      logOperation("success", {
        name: "QuestionnaireResponseRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, id: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireResponseRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a QuestionnaireResponse by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Validated updated QuestionnaireResponse record.
   */
  async update(
    id: number,
    dto: TUpdateQuestionnaireResponseDto,
  ): Promise<TQuestionnaireResponseResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireResponseRestApiService.update",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      const response = await this.client.patch(`/${id}`, dto);
      const data = await QuestionnaireResponseResponseSchema.parseAsync(
        response.data,
      );
      logOperation("success", {
        name: "QuestionnaireResponseRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, id: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireResponseRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a QuestionnaireResponse by ID.
   *
   * @param id - Public numeric ID.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireResponseRestApiService.delete",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      await this.client.delete(`/${id}`);
      logOperation("success", {
        name: "QuestionnaireResponseRestApiService.delete",
        startTimeMs,
        context: { operationId, id },
      });
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireResponseRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
