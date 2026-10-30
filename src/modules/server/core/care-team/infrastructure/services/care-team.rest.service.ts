/**
 * CareTeamRestApiService — REST transport implementation of ICareTeamsService.
 *
 * Layer: infrastructure / services
 * Resource: CareTeam (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for all CareTeam CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see care-team.graphql.service.ts.
 *
 * Environment variables required:
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  CareTeamResponseSchema,
  PaginatedCareTeamResponseSchema,
  type TCareTeamResponse,
  type TPaginatedCareTeamResponse,
  type TCreateCareTeam,
  type TUpdateCareTeamDto,
  type TListCareTeamsQuery,
} from "@/modules/entities/schemas/care-team";
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
import { ICareTeamsService } from "../../domain/interfaces/care-team.service.interface";

export class CareTeamRestApiService implements ICareTeamsService {
  /** Axios instance scoped to the fhir-gql /care-teams base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/care-teams`,
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
   * @param error - The AxiosError thrown by the axios instance on non-2xx responses.
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
   * Creates a new CareTeam.
   *
   * @param dto - Create payload (all fields optional per FHIR R4).
   * @returns The newly created CareTeam record.
   */
  async create(dto: TCreateCareTeam): Promise<TCareTeamResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "CareTeamRestApiService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await CareTeamResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "CareTeamRestApiService.create", startTimeMs, data, context: { operationId, careTeamId: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "CareTeamRestApiService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of CareTeams with optional server-side filtering.
   *
   * @param query - Optional filters: identifier, status, category, subject, patient, encounter, participant, limit, offset.
   * @returns Paginated result: { total, limit, offset, data: TCareTeamResponse[] }.
   */
  async list(query?: TListCareTeamsQuery): Promise<TPaginatedCareTeamResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "CareTeamRestApiService.list", startTimeMs, context: { operationId, ...query } });
    try {
      const res = await this.client.get<unknown>("/", {
        params: {
          identifier: query?.identifier,
          status: query?.status,
          category: query?.category,
          subject: query?.subject,
          patient: query?.patient,
          encounter: query?.encounter,
          participant: query?.participant,
          user_id: query?.user_id,
          org_id: query?.org_id,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });
      const data = await PaginatedCareTeamResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "CareTeamRestApiService.list", startTimeMs, data: data.data, context: { operationId, total: data.total } });
      return data;
    } catch (err) {
      logOperation("error", { name: "CareTeamRestApiService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single CareTeam by its numeric fhir-gql primary key.
   *
   * @param id - The fhir-gql primary key.
   * @returns The matching CareTeam record.
   */
  async getById(id: number): Promise<TCareTeamResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "CareTeamRestApiService.getById", startTimeMs, context: { operationId, careTeamId: id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await CareTeamResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "CareTeamRestApiService.getById", startTimeMs, data, context: { operationId, careTeamId: id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "CareTeamRestApiService.getById", startTimeMs, err, context: { operationId, careTeamId: id } });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a CareTeam (PATCH semantics — replace-semantics child arrays).
   *
   * @param id  - The fhir-gql primary key.
   * @param dto - Patch payload.
   * @returns The updated CareTeam record.
   */
  async update(id: number, dto: TUpdateCareTeamDto): Promise<TCareTeamResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "CareTeamRestApiService.update", startTimeMs, context: { operationId, careTeamId: id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await CareTeamResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "CareTeamRestApiService.update", startTimeMs, data, context: { operationId, careTeamId: id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "CareTeamRestApiService.update", startTimeMs, err, context: { operationId, careTeamId: id } });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a CareTeam and all its child records.
   * fhir-gql responds with 204 No Content on success.
   *
   * @param id - The fhir-gql primary key.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "CareTeamRestApiService.delete", startTimeMs, context: { operationId, careTeamId: id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "CareTeamRestApiService.delete", startTimeMs, context: { operationId, careTeamId: id } });
    } catch (err) {
      logOperation("error", { name: "CareTeamRestApiService.delete", startTimeMs, err, context: { operationId, careTeamId: id } });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
