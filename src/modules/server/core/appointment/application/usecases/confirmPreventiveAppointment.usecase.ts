/**
 * confirmPreventiveAppointmentUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: confirm a preventive-medicine appointment together with a PlanDefinition
 *
 * Orchestrates three services (appointment, encounter, plan definition):
 *   1. Create an Encounter for the appointment (reused if one already exists).
 *   2. Apply the PlanDefinition ($apply, persist=true) → one ServiceRequest per action.
 *   3. Mark the appointment `fulfilled`.
 *
 * fhir-gql has no cross-resource transaction, so the steps run sequentially and
 * are ordered so a failure is always retryable: the appointment is only flipped
 * to `fulfilled` last, an existing Encounter is reused on retry, and $apply's
 * `allow_duplicates=false` skips ServiceRequests that were already generated.
 */

import {
  isPreventiveAppointment,
  type TAppointmentResponse,
  type TConfirmPreventiveAppointment,
} from "@/modules/entities/schemas/appointment";
import { type TApplyDefinitionResponse } from "@/modules/entities/schemas/definition-apply";
import { getInjection } from "@/modules/server/di/container";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/modules/server/shared/errors/commonErrors";

/** Result handed back to the UI: updated appointment, encounter id and the $apply outcome. */
export interface IConfirmPreventiveAppointmentResult {
  appointment: TAppointmentResponse;
  encounterId: number;
  apply: TApplyDefinitionResponse;
}

/**
 * Confirms a preventive appointment: encounter → plan $apply → fulfilled.
 *
 * @param input - Appointment id, chosen PlanDefinition id and the session org_id.
 * @returns The fulfilled appointment, the encounter id and the $apply result.
 * @throws NotFoundError | ValidationError | ConflictError | UnauthorizedError | BadGatewayError
 */
export async function confirmPreventiveAppointmentUseCase(
  input: TConfirmPreventiveAppointment,
): Promise<IConfirmPreventiveAppointmentResult> {
  const appointments = getInjection("IAppointmentService");
  const encounters = getInjection("IEncounterService");
  const plans = getInjection("IPlanDefinitionsService");

  // ── Guards ────────────────────────────────────────────────────────────────
  const appointment = await appointments.getById(input.appointment_id);

  // Tenant isolation: an appointment of another org is reported as missing.
  if (
    input.org_id &&
    appointment.org_id &&
    appointment.org_id !== input.org_id
  ) {
    throw new NotFoundError("Appointment not found");
  }
  if (!isPreventiveAppointment(appointment)) {
    throw new ValidationError(
      "Appointment is not a preventive-medicine appointment",
    );
  }
  // pending = first confirm; booked = retry after a partial failure.
  if (appointment.status !== "pending" && appointment.status !== "booked") {
    throw new ConflictError(`Appointment is already ${appointment.status}`);
  }

  const plan = await plans.getById(input.plan_definition_id);
  if (input.org_id && plan.org_id && plan.org_id !== input.org_id) {
    throw new NotFoundError("Plan definition not found");
  }
  if (plan.status !== "active") {
    throw new ValidationError("Only active plan definitions can be applied");
  }

  // Participants carry the FHIR references the encounter and $apply need.
  const patient = appointment.participant?.find(
    (p) => p.reference_type === "Patient",
  );
  const practitioner = appointment.participant?.find(
    (p) => p.reference_type === "Practitioner",
  );
  if (!patient?.reference_id) {
    throw new ValidationError("Appointment has no patient participant");
  }
  const subject = `Patient/${patient.reference_id}`;
  const practitionerRef = practitioner?.reference_id
    ? `Practitioner/${practitioner.reference_id}`
    : undefined;

  // ── 1. Encounter (reuse one created by an earlier, partially failed attempt) ──
  const existing = await encounters.list({
    appointment_id: appointment.id,
    org_id: input.org_id,
    limit: 1,
  });
  let encounterId = existing.data?.[0]?.id;
  if (encounterId === undefined) {
    const nowIso = new Date().toISOString();
    const created = await encounters.create({
      org_id: input.org_id,
      // Created already `completed`: the appointment is fulfilled in the same operation.
      status: "completed",
      subject,
      actual_period_start: nowIso,
      actual_period_end: nowIso,
      // service_provider: input.org_id ? `Organization/${input.org_id}` : undefined,
      participant: [
        {
          reference: subject,
          reference_display: patient.reference_display ?? undefined,
        },
        ...(practitionerRef
          ? [
              {
                reference: practitionerRef,
                reference_display: practitioner?.reference_display ?? undefined,
              },
            ]
          : []),
      ],
      appointment: [{ reference: `Appointment/${appointment.id}` }],
    });
    encounterId = created.id;
  }

  // ── 2. Apply the plan — persist=true saves every ServiceRequest in one transaction ──
  const apply = await plans.apply(plan.id, {
    org_id: input.org_id,
    user_id: input.user_id,
    subject,
    subject_display: patient.reference_display ?? undefined,
    encounter: `Encounter/${encounterId}`,
    practitioner: practitionerRef,
    practitioner_display: practitioner?.reference_display ?? undefined,
    persist: true,
  });

  // ── 3. Fulfil the appointment last, so any earlier failure stays retryable ──
  const updated = await appointments.update(appointment.id, {
    status: "fulfilled",
  });

  return { appointment: updated, encounterId, apply };
}
