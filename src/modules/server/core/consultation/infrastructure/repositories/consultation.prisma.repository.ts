/**
 * Consultation Prisma repository.
 *
 * Layer: server / core / consultation / infrastructure / repositories
 *
 * Implements IConsultationRepository using the local Prisma client. Consultation
 * data lives in the local PostgreSQL database — not in FHIR-GQL — because virtual
 * rooms, transcripts, and AI-generated reports have no FHIR representation.
 *
 * JSON fields (virtual_conversation, soap_note, full_report, and the clinical
 * resource arrays) require a cast through pj() because Prisma v7's custom
 * generator does not accept plain objects for Json columns without an explicit
 * type assertion.
 *
 * generateRoomId() produces unique room names for LiveKit (e.g. "room_AB1C2D").
 *
 * Every method is instrumented with logOperation (start / success / error)
 * and a randomUUID operationId for distributed tracing.
 */

import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { NotFoundError } from "@/modules/server/shared/errors/commonErrors";
import type { IConsultationRepository } from "../../domain/interfaces/consultation.repository.interface";
import type {
  TConsultationResponse,
  TCreateConsultation,
  TCompleteConsultation,
  TSaveClinicalData,
  TAbandonConsultation,
} from "@/modules/entities/schemas/consultation";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Casts arbitrary values to Prisma's InputJsonValue.
 * Required for Prisma v7 with the custom generator — the generated type union
 * does not accept Record<string, unknown> without an explicit cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pj<T>(v: T): any {
  return v;
}

/**
 * Generates a unique LiveKit room name.
 * Format: "room_" + 6 uppercase hex characters (e.g. "room_AB1C2D").
 *
 * @returns A unique room name string.
 */
function generateRoomId(): string {
  return `room_${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * Maps a raw Prisma Consultation row to the TConsultationResponse DTO.
 *
 * @param row - Raw Prisma query result.
 * @returns Typed TConsultationResponse DTO.
 */
function toDto(row: {
  id: number;
  fhir_appointment_id: number;
  user_id: string;
  org_id: string | null;
  room_id: string;
  status: string;
  virtual_conversation: unknown;
  soap_note: unknown;
  full_report: unknown;
  service_requests: unknown;
  medication_requests: unknown;
  observations: unknown;
  conditions: unknown;
  created_at: Date;
  updated_at: Date;
}): TConsultationResponse {
  return {
    id: row.id,
    fhir_appointment_id: row.fhir_appointment_id,
    user_id: row.user_id,
    org_id: row.org_id,
    room_id: row.room_id,
    status: row.status as TConsultationResponse["status"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    virtual_conversation: (row.virtual_conversation as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    soap_note: (row.soap_note as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    full_report: (row.full_report as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service_requests: (row.service_requests as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    medication_requests: (row.medication_requests as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    observations: (row.observations as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions: (row.conditions as any) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

/**
 * Prisma-backed implementation of IConsultationRepository.
 * Registered in the DI container as IConsultationRepository.
 */
export class ConsultationPrismaRepository implements IConsultationRepository {
  /**
   * Provisions a new WAITING consultation with a generated LiveKit room ID.
   *
   * @param dto - fhir_appointment_id, user_id, optional org_id.
   * @returns The newly created Consultation record.
   */
  async create(dto: TCreateConsultation): Promise<TConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ConsultationPrismaRepository.create",
      startTimeMs,
      context: {
        operationId,
        fhirAppointmentId: dto.fhir_appointment_id,
        userId: dto.user_id,
      },
    });

    try {
      const row = await prisma.consultation.create({
        data: {
          fhir_appointment_id: dto.fhir_appointment_id,
          user_id: dto.user_id,
          org_id: dto.org_id ?? null,
          room_id: generateRoomId(),
          status: "WAITING",
        },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "ConsultationPrismaRepository.create",
        startTimeMs,
        data: { id: result.id, room_id: result.room_id },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "ConsultationPrismaRepository.create",
        startTimeMs,
        err,
        context: { operationId, fhirAppointmentId: dto.fhir_appointment_id },
      });
      throw err;
    }
  }

  /**
   * Writes the consultation transcript, SOAP note, and full merged report,
   * then sets status to COMPLETED.
   *
   * @param dto - fhir_appointment_id, virtual_conversation, soap_note, full_report.
   * @returns The updated Consultation record.
   * @throws NotFoundError if no consultation exists for this appointment.
   */
  async complete(dto: TCompleteConsultation): Promise<TConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ConsultationPrismaRepository.complete",
      startTimeMs,
      context: { operationId, fhirAppointmentId: dto.fhir_appointment_id },
    });

    try {
      const row = await prisma.consultation.update({
        where: { fhir_appointment_id: dto.fhir_appointment_id },
        data: {
          status: "COMPLETED",
          virtual_conversation: dto.virtual_conversation
            ? pj(dto.virtual_conversation)
            : undefined,
          soap_note: dto.soap_note ? pj(dto.soap_note) : undefined,
          full_report: dto.full_report ? pj(dto.full_report) : undefined,
        },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "ConsultationPrismaRepository.complete",
        startTimeMs,
        data: { id: result.id, status: result.status },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "ConsultationPrismaRepository.complete",
        startTimeMs,
        err,
        context: { operationId, fhirAppointmentId: dto.fhir_appointment_id },
      });
      throw new NotFoundError(
        `Consultation for appointment ${dto.fhir_appointment_id} not found`,
      );
    }
  }

  /**
   * Writes the FHIR clinical resources extracted from the SOAP note.
   * Called in the post-consultation review step.
   *
   * @param dto - fhir_appointment_id + resource arrays.
   * @returns The updated Consultation record.
   * @throws NotFoundError if no consultation exists for this appointment.
   */
  async saveClinicalData(dto: TSaveClinicalData): Promise<TConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ConsultationPrismaRepository.saveClinicalData",
      startTimeMs,
      context: { operationId, fhirAppointmentId: dto.fhir_appointment_id },
    });

    try {
      const row = await prisma.consultation.update({
        where: { fhir_appointment_id: dto.fhir_appointment_id },
        data: {
          service_requests: dto.service_requests
            ? pj(dto.service_requests)
            : undefined,
          medication_requests: dto.medication_requests
            ? pj(dto.medication_requests)
            : undefined,
          observations: dto.observations ? pj(dto.observations) : undefined,
          conditions: dto.conditions ? pj(dto.conditions) : undefined,
        },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "ConsultationPrismaRepository.saveClinicalData",
        startTimeMs,
        data: { id: result.id },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "ConsultationPrismaRepository.saveClinicalData",
        startTimeMs,
        err,
        context: { operationId, fhirAppointmentId: dto.fhir_appointment_id },
      });
      throw new NotFoundError(
        `Consultation for appointment ${dto.fhir_appointment_id} not found`,
      );
    }
  }

  /**
   * Marks a consultation as ABANDONED.
   *
   * @param dto - fhir_appointment_id.
   * @returns The updated Consultation record.
   * @throws NotFoundError if no consultation exists for this appointment.
   */
  async abandon(dto: TAbandonConsultation): Promise<TConsultationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ConsultationPrismaRepository.abandon",
      startTimeMs,
      context: { operationId, fhirAppointmentId: dto.fhir_appointment_id },
    });

    try {
      const row = await prisma.consultation.update({
        where: { fhir_appointment_id: dto.fhir_appointment_id },
        data: { status: "ABANDONED" },
      });

      const result = toDto(row);

      logOperation("success", {
        name: "ConsultationPrismaRepository.abandon",
        startTimeMs,
        data: { id: result.id, status: result.status },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "ConsultationPrismaRepository.abandon",
        startTimeMs,
        err,
        context: { operationId, fhirAppointmentId: dto.fhir_appointment_id },
      });
      throw new NotFoundError(
        `Consultation for appointment ${dto.fhir_appointment_id} not found`,
      );
    }
  }

  /**
   * Fetches the consultation linked to a specific FHIR appointment.
   * Returns null when no consultation was provisioned for this appointment.
   *
   * @param fhirAppointmentId - FHIR Appointment.id.
   * @returns The Consultation record or null.
   */
  async getByFhirAppointmentId(
    fhirAppointmentId: number,
  ): Promise<TConsultationResponse | null> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ConsultationPrismaRepository.getByFhirAppointmentId",
      startTimeMs,
      context: { operationId, fhirAppointmentId },
    });

    try {
      const row = await prisma.consultation.findUnique({
        where: { fhir_appointment_id: fhirAppointmentId },
      });

      const result = row ? toDto(row) : null;

      logOperation("success", {
        name: "ConsultationPrismaRepository.getByFhirAppointmentId",
        startTimeMs,
        data: { found: result !== null, id: result?.id },
        context: { operationId },
      });

      return result;
    } catch (err) {
      logOperation("error", {
        name: "ConsultationPrismaRepository.getByFhirAppointmentId",
        startTimeMs,
        err,
        context: { operationId, fhirAppointmentId },
      });
      throw err;
    }
  }
}
