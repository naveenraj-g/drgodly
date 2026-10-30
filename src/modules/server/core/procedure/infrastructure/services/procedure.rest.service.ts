/**
 * ProcedureRestApiService — REST transport implementation of IProceduresService.
 *
 * Layer: infrastructure / services
 * Resource: Procedure (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for all Procedure CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see procedure.graphql.service.ts.
 *
 * Environment variables required:
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  ProcedureResponseSchema,
  PaginatedProcedureResponseSchema,
  type TCreateProcedure,
  type TListProceduresQuery,
  type TProcedureResponse,
  type TPaginatedProcedureResponse,
  type TUpdateProcedureDto,
} from "@/modules/entities/schemas/procedure";
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
import { IProceduresService } from "../../domain/interfaces/procedure.service.interface";

export class ProcedureRestApiService implements IProceduresService {
  /** Axios instance scoped to the fhir-gql /procedures base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/procedures`,
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
   * Creates a new Procedure.
   * @param dto - `status` and `subject` are required; everything else optional.
   * @returns The newly created Procedure record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreateProcedure): Promise<TProcedureResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ProcedureRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await ProcedureResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ProcedureRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, procedureId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ProcedureRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of Procedures with optional server-side filtering.
   * @param query - Optional filters: status, code, patient, encounter, performer, org_id, user_id, limit, offset.
   * @returns Paginated result: { total, limit, offset, data: TProcedureResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListProceduresQuery): Promise<TPaginatedProcedureResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ProcedureRestApiService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          status: query?.status,
          code: query?.code,
          patient: query?.patient,
          encounter: query?.encounter,
          performer: query?.performer,
          user_id: query?.user_id,
          org_id: query?.org_id,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedProcedureResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ProcedureRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ProcedureRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single Procedure by its public fhir-gql ID.
   * @param id - The fhir-gql public identifier.
   * @returns The matching Procedure record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TProcedureResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ProcedureRestApiService.getById",
      startTimeMs,
      context: { operationId, procedureId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await ProcedureResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ProcedureRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, procedureId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ProcedureRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, procedureId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a Procedure (scalar/reference fields + REPLACE-semantics child arrays).
   * @param id  - The fhir-gql public identifier.
   * @param dto - Patchable fields (at least one must be provided).
   * @returns The updated Procedure record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TUpdateProcedureDto): Promise<TProcedureResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ProcedureRestApiService.update",
      startTimeMs,
      context: { operationId, procedureId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await ProcedureResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "ProcedureRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, procedureId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "ProcedureRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, procedureId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a Procedure and cascades to all child records.
   * @param id - The fhir-gql public identifier.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ProcedureRestApiService.delete",
      startTimeMs,
      context: { operationId, procedureId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "ProcedureRestApiService.delete",
        startTimeMs,
        context: { operationId, procedureId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "ProcedureRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, procedureId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
