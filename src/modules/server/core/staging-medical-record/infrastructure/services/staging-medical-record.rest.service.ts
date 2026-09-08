/**
 * StagingMedicalRecordRestApiService — REST transport implementation of
 * IStagingMedicalRecordsService.
 *
 * Layer: server / core / staging-medical-record / infrastructure
 * Transport: REST (bound when FHIR_TRANSPORT !== "graphql")
 *
 * Points at FHIR_STAGING_SERVER_URL directly — that env var already includes
 * the full resource path (.../api/v1/staging-records), unlike FHIR_GQL_URL
 * which other modules append a resource segment to.
 *
 * No JWT interceptor: the staging-area service does not authenticate —
 * org_id/user_id are plain forwarded fields, trusted as given, per its own
 * OpenAPI spec.
 */
import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { handleFhirApiError } from "@/modules/server/shared/errors/handleFhirApiError";
import {
  StagingMedicalRecordResponseSchema,
  PaginatedStagingMedicalRecordResponseSchema,
  type TStagingMedicalRecordResponse,
  type TPaginatedStagingMedicalRecordResponse,
  type TCreateStagingMedicalRecord,
  type TUpdateStagingMedicalRecordDto,
  type TReviewStagingMedicalRecordDto,
  type TListStagingMedicalRecordsQuery,
} from "@/modules/entities/schemas/staging-medical-record";
import { IStagingMedicalRecordsService } from "../../domain/interfaces/staging-medical-record.service.interface";

export class StagingMedicalRecordRestApiService
  implements IStagingMedicalRecordsService
{
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_STAGING_SERVER_URL;
    if (!url) throw new Error("FHIR_STAGING_SERVER_URL is not configured");

    this.client = axios.create({
      baseURL: url,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });
  }

  /** Maps AxiosError → domain error using the shared fhir-gql-style mapper (this service is also FastAPI/Pydantic). */
  private handleError(error: AxiosError): never {
    handleFhirApiError(error, "StagingMedicalRecord");
  }

  async create(
    dto: TCreateStagingMedicalRecord,
  ): Promise<TStagingMedicalRecordResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "StagingMedicalRecordRestApiService.create",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await StagingMedicalRecordResponseSchema.parseAsync(
        res.data,
      );
      logOperation("success", {
        name: "StagingMedicalRecordRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, id: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "StagingMedicalRecordRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  async list(
    query?: TListStagingMedicalRecordsQuery,
  ): Promise<TPaginatedStagingMedicalRecordResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "StagingMedicalRecordRestApiService.list",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedStagingMedicalRecordResponseSchema.parseAsync(
        res.data,
      );
      logOperation("success", {
        name: "StagingMedicalRecordRestApiService.list",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "StagingMedicalRecordRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  async getById(id: number): Promise<TStagingMedicalRecordResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "StagingMedicalRecordRestApiService.getById",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await StagingMedicalRecordResponseSchema.parseAsync(
        res.data,
      );
      logOperation("success", {
        name: "StagingMedicalRecordRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "StagingMedicalRecordRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  async update(
    id: number,
    dto: TUpdateStagingMedicalRecordDto,
  ): Promise<TStagingMedicalRecordResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "StagingMedicalRecordRestApiService.update",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await StagingMedicalRecordResponseSchema.parseAsync(
        res.data,
      );
      logOperation("success", {
        name: "StagingMedicalRecordRestApiService.update",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "StagingMedicalRecordRestApiService.update",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  async review(
    id: number,
    dto: TReviewStagingMedicalRecordDto,
  ): Promise<TStagingMedicalRecordResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "StagingMedicalRecordRestApiService.review",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.patch<unknown>(`/${id}/review`, dto);
      const data = await StagingMedicalRecordResponseSchema.parseAsync(
        res.data,
      );
      logOperation("success", {
        name: "StagingMedicalRecordRestApiService.review",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "StagingMedicalRecordRestApiService.review",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "StagingMedicalRecordRestApiService.delete",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", {
        name: "StagingMedicalRecordRestApiService.delete",
        startTimeMs,
        context: { operationId },
      });
    } catch (err) {
      logOperation("error", {
        name: "StagingMedicalRecordRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
