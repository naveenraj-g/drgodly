/**
 * RiskAssessmentRestApiService — REST transport implementation of IRiskAssessmentsService.
 *
 * Layer: infrastructure / services
 * Resource: RiskAssessment (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for RiskAssessment CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see risk-assessment.graphql.service.ts.
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  RiskAssessmentResponseSchema,
  PaginatedRiskAssessmentResponseSchema,
  type TCreateRiskAssessment,
  type TUpdateRiskAssessmentDto,
  type TListRiskAssessmentsQuery,
  type TRiskAssessmentResponse,
  type TPaginatedRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
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
import { IRiskAssessmentsService } from "../../domain/interfaces/risk-assessment.service.interface";

export class RiskAssessmentRestApiService implements IRiskAssessmentsService {
  /** Axios instance scoped to the fhir-gql /risk-assessments base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/risk-assessments`,
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
   * Creates a new RiskAssessment.
   *
   * @param dto - RiskAssessment create payload.
   * @returns Validated RiskAssessment response.
   */
  async create(dto: TCreateRiskAssessment): Promise<TRiskAssessmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "RiskAssessmentRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const response = await this.client.post("/", dto);
      const data = await RiskAssessmentResponseSchema.parseAsync(response.data);
      logOperation("success", {
        name: "RiskAssessmentRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, id: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "RiskAssessmentRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of RiskAssessments matching query filters.
   *
   * @param query - Optional search/filter parameters.
   * @returns Validated paginated RiskAssessments response.
   */
  async list(
    query?: TListRiskAssessmentsQuery,
  ): Promise<TPaginatedRiskAssessmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "RiskAssessmentRestApiService.list",
      startTimeMs,
      context: { operationId, query },
    });

    try {
      const response = await this.client.get("/", { params: query });
      const data = await PaginatedRiskAssessmentResponseSchema.parseAsync(
        response.data,
      );
      logOperation("success", {
        name: "RiskAssessmentRestApiService.list",
        startTimeMs,
        data,
        context: { operationId, total: data.total },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "RiskAssessmentRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a RiskAssessment by ID.
   *
   * @param id - Public numeric ID.
   * @returns Validated RiskAssessment record.
   */
  async getById(id: number): Promise<TRiskAssessmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "RiskAssessmentRestApiService.getById",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      const response = await this.client.get(`/${id}`);
      const data = await RiskAssessmentResponseSchema.parseAsync(response.data);
      logOperation("success", {
        name: "RiskAssessmentRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, id: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "RiskAssessmentRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a RiskAssessment by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Validated updated RiskAssessment record.
   */
  async update(
    id: number,
    dto: TUpdateRiskAssessmentDto,
  ): Promise<TRiskAssessmentResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "RiskAssessmentRestApiService.update",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      const response = await this.client.patch(`/${id}`, dto);
      const data = await RiskAssessmentResponseSchema.parseAsync(response.data);
      logOperation("success", {
        name: "RiskAssessmentRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, id: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "RiskAssessmentRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a RiskAssessment by ID.
   *
   * @param id - Public numeric ID.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "RiskAssessmentRestApiService.delete",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      await this.client.delete(`/${id}`);
      logOperation("success", {
        name: "RiskAssessmentRestApiService.delete",
        startTimeMs,
        context: { operationId, id },
      });
    } catch (err) {
      logOperation("error", {
        name: "RiskAssessmentRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
