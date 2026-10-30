/**
 * EpisodeOfCareRestApiService — REST transport implementation of IEpisodeOfCaresService.
 *
 * Layer: server / core / episode-of-care / infrastructure / services
 *
 * All 5 CRUD operations against fhir-gql /episode-of-cares in one file — this
 * resource has no sub-resource groups. Uses the shared handleFhirApiError for
 * Axios → domain error mapping.
 *
 * Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { handleFhirApiError } from "@/modules/server/shared/errors/handleFhirApiError";
import { IEpisodeOfCaresService } from "../../domain/interfaces/episode-of-care.service.interface";
import {
  EpisodeOfCareResponseSchema,
  PaginatedEpisodeOfCareResponseSchema,
  type TEpisodeOfCareResponse,
  type TPaginatedEpisodeOfCareResponse,
  type TCreateEpisodeOfCare,
  type TUpdateEpisodeOfCareDto,
  type TListEpisodeOfCaresQuery,
} from "@/modules/entities/schemas/episode-of-care";

/** REST implementation of IEpisodeOfCaresService, talking to fhir-gql /episode-of-cares. */
export class EpisodeOfCareRestApiService implements IEpisodeOfCaresService {
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/episode-of-cares`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    this.client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });
  }

  /**
   * POST /episode-of-cares/ — creates an EpisodeOfCare.
   * @param dto - `status` and `patient` are required.
   */
  async create(dto: TCreateEpisodeOfCare): Promise<TEpisodeOfCareResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "EpisodeOfCareRestApiService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await EpisodeOfCareResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "EpisodeOfCareRestApiService.create", startTimeMs, data, context: { operationId, id: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "EpisodeOfCareRestApiService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleFhirApiError(err, "EpisodeOfCare");
      throw err;
    }
  }

  /**
   * GET /episode-of-cares/ — paginated list with optional FHIR R4 search filters.
   * @param query - Optional filters.
   */
  async list(query?: TListEpisodeOfCaresQuery): Promise<TPaginatedEpisodeOfCareResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "EpisodeOfCareRestApiService.list", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedEpisodeOfCareResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "EpisodeOfCareRestApiService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "EpisodeOfCareRestApiService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleFhirApiError(err, "EpisodeOfCare");
      throw err;
    }
  }

  /**
   * GET /episode-of-cares/{id} — single EpisodeOfCare by ID.
   * @param id - fhir-gql database ID.
   */
  async getById(id: number): Promise<TEpisodeOfCareResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "EpisodeOfCareRestApiService.getById", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await EpisodeOfCareResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "EpisodeOfCareRestApiService.getById", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "EpisodeOfCareRestApiService.getById", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleFhirApiError(err, "EpisodeOfCare");
      throw err;
    }
  }

  /**
   * PATCH /episode-of-cares/{id} — patches fields. Child arrays use REPLACE semantics.
   * @param id - fhir-gql database ID.
   * @param dto - Patch payload.
   */
  async update(id: number, dto: TUpdateEpisodeOfCareDto): Promise<TEpisodeOfCareResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "EpisodeOfCareRestApiService.update", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await EpisodeOfCareResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "EpisodeOfCareRestApiService.update", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "EpisodeOfCareRestApiService.update", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleFhirApiError(err, "EpisodeOfCare");
      throw err;
    }
  }

  /**
   * DELETE /episode-of-cares/{id} — permanently removes an EpisodeOfCare.
   * @param id - fhir-gql database ID.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "EpisodeOfCareRestApiService.delete", startTimeMs, context: { operationId, id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "EpisodeOfCareRestApiService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "EpisodeOfCareRestApiService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleFhirApiError(err, "EpisodeOfCare");
      throw err;
    }
  }
}
