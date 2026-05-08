import { fhirRequest } from "./client";
import type {
  FhirEncounterCreatePayload,
  FhirEncounterPatchPayload,
  FhirEncounterResponse,
} from "./types";

// NOTE: Appointments reference this via the integer form of the id
// (encounter_id: 20001), so parse the returned id as a number when needed.
export async function createFhirEncounter(
  payload: FhirEncounterCreatePayload,
): Promise<FhirEncounterResponse> {
  return fhirRequest<FhirEncounterResponse>(
    "POST",
    "/api/fhir/v1/encounters/",
    payload,
  );
}

// Only lifecycle fields are patchable: status, period_end, priority.
export async function updateFhirEncounter(
  fhirEncounterId: string,
  payload: FhirEncounterPatchPayload,
): Promise<FhirEncounterResponse> {
  return fhirRequest<FhirEncounterResponse>(
    "PATCH",
    `/api/fhir/v1/encounters/${fhirEncounterId}`,
    payload,
  );
}

export async function deleteFhirEncounter(
  fhirEncounterId: string,
): Promise<void> {
  return fhirRequest<void>(
    "DELETE",
    `/api/fhir/v1/encounters/${fhirEncounterId}`,
  );
}
