/**
 * Intake Prisma repository.
 *
 * Layer: server / core / intake / infrastructure / repositories
 *
 * Implements IIntakeRepository using the local Prisma client. Intake data
 * lives in the local PostgreSQL database — not in FHIR-GQL — because intake
 * is proprietary application data that has no FHIR representation.
 *
 * JSON fields (conversation, report) require a cast through `pj()` because
 * Prisma v7's custom generator does not accept plain objects for Json columns
 * without an explicit type assertion.
 */

import { prisma } from "@/lib/db";
import { NotFoundError } from "@/modules/server/shared/errors/commonErrors";
import type { IIntakeRepository } from "../../domain/interfaces/intake.repository.interface";
import type {
  TIntakeResponse,
  TCreateIntake,
  TUpdateIntake,
  TLinkIntake,
  TAbandonIntake,
} from "@/modules/entities/schemas/intake";

/**
 * Casts arbitrary values to Prisma's InputJsonValue.
 * Required for Prisma v7 with the custom generator — the generated type
 * union does not accept `Record<string, unknown>` without an explicit cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pj<T>(v: T): any {
  return v;
}

/**
 * Maps a raw Prisma Intake row to the TIntakeResponse DTO.
 * Coerces Dates to ISO strings and narrows Json fields.
 *
 * @param row - Raw Prisma query result.
 * @returns Typed TIntakeResponse DTO.
 */
function toDto(row: {
  id: number;
  user_id: string;
  org_id: string | null;
  patient_fhir_id: number | null;
  mode: string;
  status: string;
  conversation: unknown;
  report: unknown;
  fhir_appointment_id: number | null;
  created_at: Date;
  updated_at: Date;
}): TIntakeResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    org_id: row.org_id,
    patient_fhir_id: row.patient_fhir_id,
    mode: row.mode as TIntakeResponse["mode"],
    status: row.status as TIntakeResponse["status"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conversation: (row.conversation as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report: (row.report as any) ?? null,
    fhir_appointment_id: row.fhir_appointment_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Prisma-backed implementation of IIntakeRepository.
 * Registered in the DI container as IIntakeRepository.
 */
export class IntakePrismaRepository implements IIntakeRepository {
  /**
   * Creates a new IN_PROGRESS intake session.
   *
   * @param dto - userId, org_id, optional patient_fhir_id, mode.
   * @returns The created Intake record.
   */
  async createIntake(dto: TCreateIntake): Promise<TIntakeResponse> {
    const row = await prisma.intake.create({
      data: {
        user_id: dto.userId,
        org_id: dto.org_id ?? null,
        patient_fhir_id: dto.patient_fhir_id ?? null,
        mode: dto.mode,
        status: "IN_PROGRESS",
      },
    });
    return toDto(row);
  }

  /**
   * Saves the conversation transcript and AI report, sets status to COMPLETED.
   *
   * @param dto - id, conversation array, optional report.
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  async updateIntake(dto: TUpdateIntake): Promise<TIntakeResponse> {
    try {
      const row = await prisma.intake.update({
        where: { id: dto.id },
        data: {
          conversation: pj(dto.conversation),
          report: dto.report ? pj(dto.report) : undefined,
          status: "COMPLETED",
        },
      });
      return toDto(row);
    } catch {
      throw new NotFoundError(`Intake ${dto.id} not found`);
    }
  }

  /**
   * Links a completed intake to its downstream FHIR appointment.
   *
   * @param dto - id, fhir_appointment_id.
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  async linkToAppointment(dto: TLinkIntake): Promise<TIntakeResponse> {
    try {
      const row = await prisma.intake.update({
        where: { id: dto.id },
        data: { fhir_appointment_id: dto.fhir_appointment_id },
      });
      return toDto(row);
    } catch {
      throw new NotFoundError(`Intake ${dto.id} not found`);
    }
  }

  /**
   * Marks an in-progress intake as ABANDONED.
   *
   * @param dto - id.
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  async abandonIntake(dto: TAbandonIntake): Promise<TIntakeResponse> {
    try {
      const row = await prisma.intake.update({
        where: { id: dto.id },
        data: { status: "ABANDONED" },
      });
      return toDto(row);
    } catch {
      throw new NotFoundError(`Intake ${dto.id} not found`);
    }
  }

  /**
   * Fetches a single intake by its local integer ID.
   *
   * @param id - Intake.id.
   * @returns The Intake record.
   * @throws NotFoundError if not found.
   */
  async getById(id: number): Promise<TIntakeResponse> {
    const row = await prisma.intake.findUnique({ where: { id } });
    if (!row) throw new NotFoundError(`Intake ${id} not found`);
    return toDto(row);
  }

  /**
   * Fetches the intake linked to a specific FHIR appointment ID.
   * Returns null when no intake was linked (appointment was booked directly).
   *
   * @param fhirAppointmentId - FHIR Appointment.id.
   * @returns Linked Intake record or null.
   */
  async getByFhirAppointmentId(fhirAppointmentId: number): Promise<TIntakeResponse | null> {
    const row = await prisma.intake.findFirst({
      where: { fhir_appointment_id: fhirAppointmentId },
    });
    return row ? toDto(row) : null;
  }
}
