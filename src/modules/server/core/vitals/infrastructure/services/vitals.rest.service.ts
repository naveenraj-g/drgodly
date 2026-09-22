/**
 * VitalsRestApiService — REST transport implementation of IVitalsService.
 *
 * Layer: infrastructure / services
 * Resource: Vitals (custom, non-FHIR — wearable/manual health and activity metrics)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for all vitals CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see vitals.graphql.service.ts.
 *
 * Environment variables required:
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  VitalsResponseSchema,
  PaginatedVitalsResponseSchema,
  TCreateVitals,
  TListVitalsQuery,
  TVitalsResponse,
  TPaginatedVitalsResponse,
  TPatchVitalsDto,
} from "@/modules/entities/schemas/vitals";
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
import { IVitalsService } from "../../domain/interfaces/vitals.service.interface";

export class VitalsRestApiService implements IVitalsService {
  /** Axios instance scoped to the fhir-gql /vitals base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/vitals`,
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
   * HTTP status → domain error mapping:
   *  400 → ValidationError   401 → UnauthorizedError   403 → ForbiddenError
   *  404 → NotFoundError     409 → ConflictError        429 → RateLimitError
   *  5xx → BadGatewayError
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
   * Records a new vitals entry in fhir-gql.
   * @param dto - Creation payload.
   * @returns The newly created vitals record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreateVitals): Promise<TVitalsResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "VitalsRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await VitalsResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "VitalsRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, vitalsId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "VitalsRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of vitals entries with optional server-side filtering.
   * @param query - Optional filters: user_id, patient_id, org_id, date, recorded_at range, limit, offset.
   * @returns Paginated result: { total, limit, offset, data: TVitalsResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListVitalsQuery): Promise<TPaginatedVitalsResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "VitalsRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          user_id: query?.user_id,
          patient_id: query?.patient_id,
          org_id: query?.org_id,
          date: query?.date,
          recorded_at_from: query?.recorded_at_from,
          recorded_at_to: query?.recorded_at_to,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedVitalsResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "VitalsRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "VitalsRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single vitals entry by its public fhir-gql vitals_id.
   * @param id - The fhir-gql public identifier.
   * @returns The matching vitals record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TVitalsResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "VitalsRestApiService.getById",
      startTimeMs,
      context: { operationId, vitalsId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await VitalsResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "VitalsRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, vitalsId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "VitalsRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, vitalsId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a vitals entry (PATCH semantics — metric fields only).
   * @param id  - The fhir-gql public identifier.
   * @param dto - Patchable fields (at least one must be provided).
   * @returns The updated vitals record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TPatchVitalsDto): Promise<TVitalsResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "VitalsRestApiService.update",
      startTimeMs,
      context: { operationId, vitalsId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await VitalsResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "VitalsRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, vitalsId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "VitalsRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, vitalsId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a vitals entry.
   * @param id - The fhir-gql public identifier.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "VitalsRestApiService.delete",
      startTimeMs,
      context: { operationId, vitalsId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "VitalsRestApiService.delete",
        startTimeMs,
        context: { operationId, vitalsId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "VitalsRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, vitalsId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
