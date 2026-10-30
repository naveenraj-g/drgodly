/**
 * QuestionnaireRestApiService — REST transport implementation of IQuestionnairesService.
 *
 * Layer: infrastructure / services
 * Resource: Questionnaire (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * Responsibilities:
 *  - Calls the fhir-gql REST API for Questionnaire CRUD operations.
 *  - Attaches a fresh JWT to every request via an axios request interceptor.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError HTTP status codes to domain errors.
 *  - Emits structured start / success / error log entries via logOperation.
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see questionnaire.graphql.service.ts.
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  QuestionnaireResponseSchema,
  PaginatedQuestionnaireResponseSchema,
  type TCreateQuestionnaire,
  type TUpdateQuestionnaireDto,
  type TListQuestionnairesQuery,
  type TQuestionnaireResponse,
  type TPaginatedQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
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
import { IQuestionnairesService } from "../../domain/interfaces/questionnaire.service.interface";

export class QuestionnaireRestApiService implements IQuestionnairesService {
  /** Axios instance scoped to the fhir-gql /questionnaires base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/questionnaires`,
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
   * Creates a new Questionnaire.
   *
   * @param dto - Questionnaire create data.
   * @returns The newly created Questionnaire record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreateQuestionnaire): Promise<TQuestionnaireResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireRestApiService.create",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await QuestionnaireResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "QuestionnaireRestApiService.create",
        startTimeMs,
        data,
        context: { operationId, questionnaireId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireRestApiService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Returns a paginated list of Questionnaires with optional server-side filtering.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated result: { total, limit, offset, data: TQuestionnaireResponse[] }.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListQuestionnairesQuery): Promise<TPaginatedQuestionnaireResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireRestApiService.list",
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
          status: query?.status,
          name: query?.name,
          title: query?.title,
          publisher: query?.publisher,
          description: query?.description,
          jurisdiction: query?.jurisdiction,
          code: query?.code,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });

      const data = await PaginatedQuestionnaireResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "QuestionnaireRestApiService.list",
        startTimeMs,
        data: data.data,
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireRestApiService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Fetches a single Questionnaire by its public fhir-gql ID.
   *
   * @param id - The fhir-gql public identifier.
   * @returns The matching Questionnaire record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TQuestionnaireResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireRestApiService.getById",
      startTimeMs,
      context: { operationId, questionnaireId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await QuestionnaireResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "QuestionnaireRestApiService.getById",
        startTimeMs,
        data,
        context: { operationId, questionnaireId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireRestApiService.getById",
        startTimeMs,
        err,
        context: { operationId, questionnaireId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a Questionnaire.
   *
   * @param id  - The fhir-gql public identifier.
   * @param dto - Patchable fields.
   * @returns The updated Questionnaire record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(
    id: number,
    dto: TUpdateQuestionnaireDto,
  ): Promise<TQuestionnaireResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireRestApiService.update",
      startTimeMs,
      context: { operationId, questionnaireId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await QuestionnaireResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "QuestionnaireRestApiService.update",
        startTimeMs,
        data,
        context: { operationId, questionnaireId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireRestApiService.update",
        startTimeMs,
        err,
        context: { operationId, questionnaireId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Permanently deletes a Questionnaire.
   *
   * @param id - The fhir-gql public identifier.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "QuestionnaireRestApiService.delete",
      startTimeMs,
      context: { operationId, questionnaireId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "QuestionnaireRestApiService.delete",
        startTimeMs,
        context: { operationId, questionnaireId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "QuestionnaireRestApiService.delete",
        startTimeMs,
        err,
        context: { operationId, questionnaireId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
