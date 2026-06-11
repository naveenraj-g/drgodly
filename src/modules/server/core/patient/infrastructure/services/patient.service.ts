/**
 * PatientService — infrastructure layer implementation of IPatientsService.
 *
 * Responsibilities:
 *  - Calls the drgodly orchestrator REST API for all patient-related operations.
 *  - Attaches a fresh JWT (obtained via `getAuthToken`) to every request through
 *    an axios request interceptor — no manual header management per method.
 *  - Validates every API response against Zod schemas before returning.
 *  - Maps AxiosError status codes to domain errors so upper layers stay decoupled
 *    from HTTP concerns.
 *  - Emits structured log entries (start / success / error) for every method via
 *    `logOperation`, enabling end-to-end traceability.
 *
 * Environment variables required:
 *  - ORCHESTRATOR_API_URL — base URL of the orchestrator, e.g. http://localhost:3010/api/v1
 */

import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  PaginatedPatientResponseSchema,
  PatientResponseSchema,
  PatientSummarySchema,
  TListPatientsQuery,
  TPaginatedPatientResponse,
  TPatientResponse,
  TPatientSummary,
  TRegisterPatient,
  TUpdatePatientDto,
} from "@/modules/entities/schemas/patient/patient.schema";
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
import { IPatientsService } from "../../domain/interfaces/patient.service.interface";

export class PatientService implements IPatientsService {
  /** Axios instance scoped to the orchestrator's /patients base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.ORCHESTRATOR_API_URL;
    if (!url) throw new Error("ORCHESTRATOR_API_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/patients`,
      headers: { "Content-Type": "application/json" },
      // 10 s timeout — matches the orchestrator's own FHIR client default.
      timeout: 10_000,
    });

    /**
     * Request interceptor: attaches a fresh JWT before every outgoing request.
     * Tokens are short-lived and must not be reused across requests.
     */
    this.client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Maps an AxiosError from the orchestrator to the appropriate domain error and throws it.
   * Always throws — return type `never` communicates this to TypeScript so callers
   * don't need a follow-up `throw`.
   *
   * HTTP status → domain error mapping:
   *  400 → ValidationError
   *  401 → UnauthorizedError
   *  403 → ForbiddenError
   *  404 → NotFoundError
   *  409 → ConflictError
   *  429 → RateLimitError
   *  5xx → BadGatewayError
   *
   * @param error - The AxiosError thrown by the axios instance on non-2xx responses.
   */
  private handleError(error: AxiosError): never {
    // The response body is already parsed by axios — no need to call .json().
    const body = error.response?.data as Record<string, unknown> | undefined;
    const message =
      typeof body?.message === "string"
        ? body.message
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
        // Treat any unmapped status (5xx, etc.) as a downstream gateway error.
        throw new BadGatewayError(
          `Orchestrator error ${error.response?.status ?? "unknown"}: ${message}`
        );
    }
  }

  /**
   * Registers a new patient in the orchestrator.
   *
   * @param dto - Registration payload (name, DOB, gender, user_id, org_id, etc.).
   * @returns The newly created patient record.
   * @throws ValidationError | ConflictError | UnauthorizedError | BadGatewayError
   */
  async register(dto: TRegisterPatient): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PatientService.register",
      startTimeMs,
      context: { operationId, user_id: dto.user_id, org_id: dto.org_id },
    });

    try {
      const res = await this.client.post<unknown>("/register", dto);
      const data = await PatientResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PatientService.register",
        startTimeMs,
        data,
        context: { operationId, patientId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientService.register",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Lists patients with optional server-side filtering and pagination.
   *
   * @param query - Optional filter/pagination params (name, gender, active, limit, offset).
   * @returns A paginated result containing matching patient records.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListPatientsQuery): Promise<TPaginatedPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PatientService.list",
      startTimeMs,
      context: { operationId, ...query },
    });

    try {
      // Build params only for defined values — axios omits undefined params automatically.
      const res = await this.client.get<unknown>("/", {
        params: {
          family_name: query?.family_name,
          given_name: query?.given_name,
          gender: query?.gender,
          active: query?.active,
          limit: query?.limit,
          offset: query?.offset,
        },
      });

      const data = await PaginatedPatientResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PatientService.list",
        startTimeMs,
        data: data.data, // pass the array so recordCount is derived correctly
        context: { operationId, total: data.total },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Retrieves the patient record belonging to the currently authenticated user.
   * The user identity is derived from the JWT by the orchestrator.
   *
   * @returns The caller's patient record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getMe(): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PatientService.getMe",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await this.client.get<unknown>("/me");
      const data = await PatientResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PatientService.getMe",
        startTimeMs,
        data,
        context: { operationId, patientId: data.id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientService.getMe",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Retrieves a single patient by their numeric ID.
   *
   * @param id - The orchestrator-assigned patient ID.
   * @returns The matching patient record.
   * @throws NotFoundError | ForbiddenError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PatientService.getById",
      startTimeMs,
      context: { operationId, patientId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await PatientResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PatientService.getById",
        startTimeMs,
        data,
        context: { operationId, patientId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientService.getById",
        startTimeMs,
        err,
        context: { operationId, patientId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Retrieves a patient's clinical summary (demographics, encounters,
   * conditions, medications) aggregated by the orchestrator.
   *
   * @param id - The orchestrator-assigned patient ID.
   * @returns The patient summary object.
   * @throws NotFoundError | ForbiddenError | UnauthorizedError | BadGatewayError
   */
  async getSummary(id: number): Promise<TPatientSummary> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PatientService.getSummary",
      startTimeMs,
      context: { operationId, patientId: id },
    });

    try {
      const res = await this.client.get<unknown>(`/${id}/summary`);
      const data = await PatientSummarySchema.parseAsync(res.data);

      logOperation("success", {
        name: "PatientService.getSummary",
        startTimeMs,
        data,
        context: { operationId, patientId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientService.getSummary",
        startTimeMs,
        err,
        context: { operationId, patientId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Partially updates a patient record (PATCH semantics — only provided fields change).
   *
   * @param id  - The orchestrator-assigned patient ID.
   * @param dto - Fields to update (all optional; only send what changes).
   * @returns The updated patient record.
   * @throws ValidationError | NotFoundError | ForbiddenError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TUpdatePatientDto): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PatientService.update",
      startTimeMs,
      context: { operationId, patientId: id },
    });

    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await PatientResponseSchema.parseAsync(res.data);

      logOperation("success", {
        name: "PatientService.update",
        startTimeMs,
        data,
        context: { operationId, patientId: id },
      });

      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientService.update",
        startTimeMs,
        err,
        context: { operationId, patientId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  /**
   * Deletes a patient record from the orchestrator (hard delete).
   * Returns void on success (orchestrator responds with 204 No Content).
   *
   * @param id - The orchestrator-assigned patient ID.
   * @throws NotFoundError | ForbiddenError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PatientService.delete",
      startTimeMs,
      context: { operationId, patientId: id },
    });

    try {
      await this.client.delete(`/${id}`);

      logOperation("success", {
        name: "PatientService.delete",
        startTimeMs,
        context: { operationId, patientId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "PatientService.delete",
        startTimeMs,
        err,
        context: { operationId, patientId: id },
      });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
}
