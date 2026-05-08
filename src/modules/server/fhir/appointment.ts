import { createFhirEncounter } from "./encounter";
import { fhirRequest } from "./client";
import type {
  EncounterClass,
  EncounterPriority,
  EncounterStatus,
  FhirAppointmentCreatePayload,
  FhirAppointmentPatchPayload,
  FhirAppointmentResponse,
  FhirAppointmentWithEncounterResult,
  FhirEncounterParticipantInput,
} from "./types";

export interface CreateFhirAppointmentInput {
  fhirPatientId: string;
  fhirPractitionerId: string;
  patientName?: string | null;
  practitionerName?: string | null;

  start: string; // ISO datetime
  end: string;   // ISO datetime
  minutesDuration?: number | null;

  appointmentStatus?: FhirAppointmentCreatePayload["status"];
  appointmentTypeMode?: "virtual" | "in-person";
  description?: string | null;
  comment?: string | null;
  patientInstruction?: string | null;
  serviceTypeCode?: string | null;
  serviceTypeDisplay?: string | null;
  specialtyCode?: string | null;
  specialtyDisplay?: string | null;

  encounterStatus?: EncounterStatus;
  encounterClass?: EncounterClass;
  encounterPriority?: EncounterPriority;
}

// Canonical appointment-creation flow:
//   1. Create an Encounter (required pre-condition).
//   2. Create an Appointment linked to that Encounter.
// Returns both IDs so the caller can persist them for future updates.
export async function createFhirAppointmentWithEncounter(
  input: CreateFhirAppointmentInput,
): Promise<FhirAppointmentWithEncounterResult> {
  const {
    fhirPatientId,
    fhirPractitionerId,
    patientName,
    practitionerName,
    start,
    end,
    minutesDuration,
    appointmentStatus = "booked",
    appointmentTypeMode,
    description,
    comment,
    patientInstruction,
    serviceTypeCode,
    serviceTypeDisplay,
    specialtyCode,
    specialtyDisplay,
    encounterStatus = "planned",
    encounterPriority = "routine",
  } = input;

  const encounterClass: EncounterClass =
    input.encounterClass ??
    (appointmentTypeMode === "virtual" ? "virtual" : "ambulatory");

  const participants: FhirEncounterParticipantInput[] = [
    {
      type_text: "Attending Physician",
      individual: `Practitioner/${fhirPractitionerId}`,
      period_start: start,
      period_end: end,
    },
  ];

  const encounter = await createFhirEncounter({
    status: encounterStatus,
    class_code: encounterClass,
    subject: `Patient/${fhirPatientId}`,
    period_start: start,
    period_end: end,
    priority: encounterPriority,
    participant: participants,
  });

  const encounterId = Number(encounter.id);

  const appointmentPayload: FhirAppointmentCreatePayload = {
    status: appointmentStatus,
    subject: `Patient/${fhirPatientId}`,
    subject_display: patientName ?? undefined,
    encounter_id: encounterId,
    start,
    end,
    minutes_duration: minutesDuration ?? undefined,
    created: new Date().toISOString(),
    description: description ?? undefined,
    comment: comment ?? undefined,
    patient_instruction: patientInstruction ?? undefined,
    service_type_code: serviceTypeCode ?? undefined,
    service_type_display: serviceTypeDisplay ?? undefined,
    specialty_code: specialtyCode ?? undefined,
    specialty_display: specialtyDisplay ?? undefined,
    appointment_type_code:
      appointmentTypeMode === "virtual" ? "VIRTUAL" : "INPERSON",
    appointment_type_display:
      appointmentTypeMode === "virtual" ? "Virtual Consultation" : "In-Person Visit",
    participant: [
      {
        actor: `Patient/${fhirPatientId}`,
        actor_display: patientName ?? undefined,
        required: "required",
        status: "accepted",
      },
      {
        actor: `Practitioner/${fhirPractitionerId}`,
        actor_display: practitionerName ?? undefined,
        type_code: "ATND",
        type_display: "attender",
        required: "required",
        status: "accepted",
      },
    ],
  };

  const appointment = await fhirRequest<FhirAppointmentResponse>(
    "POST",
    "/api/fhir/v1/appointments/",
    appointmentPayload,
  );

  return { encounter, appointment };
}

// Only patchable fields: status, start, end, minutes_duration, description,
// comment, patient_instruction, priority_value, cancellation_reason, cancellation_date.
export async function updateFhirAppointment(
  fhirAppointmentId: string,
  payload: FhirAppointmentPatchPayload,
): Promise<FhirAppointmentResponse> {
  return fhirRequest<FhirAppointmentResponse>(
    "PATCH",
    `/api/fhir/v1/appointments/${fhirAppointmentId}`,
    payload,
  );
}

// Also call deleteFhirEncounter with the linked encounter id if the encounter
// should be removed as well.
export async function deleteFhirAppointment(
  fhirAppointmentId: string,
): Promise<void> {
  return fhirRequest<void>(
    "DELETE",
    `/api/fhir/v1/appointments/${fhirAppointmentId}`,
  );
}
