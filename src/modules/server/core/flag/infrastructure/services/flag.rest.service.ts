/**
 * FlagRestApiService — REST transport implementation of IFlagsService.
 *
 * Layer: infrastructure / services
 * Resource: Flag (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for Flag CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see flag.graphql.service.ts.
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  FlagResponseSchema,
  PaginatedFlagResponseSchema,
  type TCreateFlag,
  type TUpdateFlagDto,
  type TListFlagsQuery,
  type TFlagResponse,
  type TPaginatedFlagResponse,
} from "@/modules/entities/schemas/flag";
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
import { IFlagsService } from "../../domain/interfaces/flag.service.interface";

export class FlagRestApiService implements IFlagsService {
  /** Axios instance scoped to the fhir-gql /flags base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/flags`,
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
   * Creates a new Flag.
   *
   * @param dto - Flag create data.
   * @returns The newly created Flag record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreateFlag): Promise<TFlagResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "FlagRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await FlagResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "FlagRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, flagId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "FlagRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of Flags with optional server-side filtering.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated result: { total, limit, offset, data: TFlagResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListFlagsQuery): Promise<TPaginatedFlagResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "FlagRestApiService.list",
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
          status: query?.status,
          category: query?.category,
          code: query?.code,
          subject: query?.subject,
          patient: query?.patient,
          encounter: query?.encounter,
          author: query?.author,
          date: query?.date,
          _lastUpdated: query?.last_updated,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedFlagResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "FlagRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "FlagRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single Flag by its public fhir-gql ID.
   *
   * @param id - The fhir-gql public identifier.
   * @returns The matching Flag record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TFlagResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "FlagRestApiService.getById",
      startTimeMs,
      context: { operationId, flagId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await FlagResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "FlagRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, flagId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "FlagRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, flagId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a Flag.
   *
   * @param id  - The fhir-gql public identifier.
   * @param dto - Patchable fields.
   * @returns The updated Flag record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TUpdateFlagDto): Promise<TFlagResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "FlagRestApiService.update",
      startTimeMs,
      context: { operationId, flagId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await FlagResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "FlagRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, flagId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "FlagRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, flagId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a Flag.
   *
   * @param id - The fhir-gql public identifier.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "FlagRestApiService.delete",
      startTimeMs,
      context: { operationId, flagId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "FlagRestApiService.delete",
        startTimeMs,
        context: { operationId, flagId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "FlagRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, flagId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
