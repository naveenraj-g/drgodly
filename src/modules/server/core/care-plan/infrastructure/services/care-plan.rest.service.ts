/**
 * CarePlanRestApiService — REST transport implementation of ICarePlansService.
 *
 * Layer: infrastructure / services
 * Resource: CarePlan (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for CarePlan CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see care-plan.graphql.service.ts.
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  CarePlanResponseSchema,
  PaginatedCarePlanResponseSchema,
  type TCreateCarePlan,
  type TUpdateCarePlanDto,
  type TListCarePlansQuery,
  type TCarePlanResponse,
  type TPaginatedCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
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
import { ICarePlansService } from "../../domain/interfaces/care-plan.service.interface";

export class CarePlanRestApiService implements ICarePlansService {
  /** Axios instance scoped to the fhir-gql /care-plans base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/care-plans`,
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
      case 429:
        throw new RateLimitError(message);
      default:
        throw new BadGatewayError(
          `fhir-gql error ${error.response?.status ?? "unknown"}: ${message}`,
        );
    }
  }

  /**
   * Creates a new CarePlan.
   *
   * @param dto - CarePlan create data.
   * @returns The newly created CarePlan record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreateCarePlan): Promise<TCarePlanResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "CarePlanRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await CarePlanResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "CarePlanRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, carePlanId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "CarePlanRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of CarePlans with optional server-side filtering.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated result: { total, limit, offset, data: TCarePlanResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListCarePlansQuery): Promise<TPaginatedCarePlanResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "CarePlanRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          org_id: query?.org_id,
          user_id: query?.user_id,
          status: query?.status,
          intent: query?.intent,
          patient: query?.patient_id ? `Patient/${query.patient_id}` : undefined,
          encounter: query?.encounter_id ? `Encounter/${query.encounter_id}` : undefined,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedCarePlanResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "CarePlanRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "CarePlanRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single CarePlan by its public fhir-gql ID.
   *
   * @param id - The fhir-gql public identifier.
   * @returns The matching CarePlan record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TCarePlanResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "CarePlanRestApiService.getById",
      startTimeMs,
      context: { operationId, carePlanId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await CarePlanResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "CarePlanRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, carePlanId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "CarePlanRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, carePlanId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a CarePlan.
   *
   * @param id  - The fhir-gql public identifier.
   * @param dto - Patchable fields.
   * @returns The updated CarePlan record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TUpdateCarePlanDto): Promise<TCarePlanResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "CarePlanRestApiService.update",
      startTimeMs,
      context: { operationId, carePlanId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await CarePlanResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "CarePlanRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, carePlanId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "CarePlanRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, carePlanId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a CarePlan.
   *
   * @param id - The fhir-gql public identifier.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "CarePlanRestApiService.delete",
      startTimeMs,
      context: { operationId, carePlanId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "CarePlanRestApiService.delete",
        startTimeMs,
        context: { operationId, carePlanId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "CarePlanRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, carePlanId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
