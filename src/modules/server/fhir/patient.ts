import { fhirRequest } from "./client";
import type {
  FhirPatientCreatePayload,
  FhirPatientPatchPayload,
  FhirPatientResponse,
} from "./types";

export async function createFhirPatient(
  payload: FhirPatientCreatePayload,
): Promise<FhirPatientResponse> {
  return fhirRequest<FhirPatientResponse>("POST", "/api/fhir/v1/patients/", payload);
}

export async function updateFhirPatient(
  fhirPatientId: string,
  payload: FhirPatientPatchPayload,
): Promise<FhirPatientResponse> {
  return fhirRequest<FhirPatientResponse>(
    "PATCH",
    `/api/fhir/v1/patients/${fhirPatientId}`,
    payload,
  );
}

export async function deleteFhirPatient(fhirPatientId: string): Promise<void> {
  return fhirRequest<void>("DELETE", `/api/fhir/v1/patients/${fhirPatientId}`);
}
