import { fhirRequest } from "./client";
import type {
  FhirQuestionnaireResponseCreatePayload,
  FhirQuestionnaireResponsePatchPayload,
  FhirQuestionnaireResponseResponse,
} from "./types";

// References use the string format "Resource/public_id", e.g.:
//   subject:   "Patient/10001"
//   encounter: "Encounter/20001"  ← string reference, NOT integer encounter_id
//   author:    "Practitioner/30001"
export async function createFhirQuestionnaireResponse(
  payload: FhirQuestionnaireResponseCreatePayload,
): Promise<FhirQuestionnaireResponseResponse> {
  return fhirRequest<FhirQuestionnaireResponseResponse>(
    "POST",
    "/api/fhir/v1/questionnaire-responses/",
    payload,
  );
}

// Only lifecycle fields are patchable: status, authored.
// To replace items/answers, delete and re-create the resource.
export async function updateFhirQuestionnaireResponse(
  fhirQrId: string,
  payload: FhirQuestionnaireResponsePatchPayload,
): Promise<FhirQuestionnaireResponseResponse> {
  return fhirRequest<FhirQuestionnaireResponseResponse>(
    "PATCH",
    `/api/fhir/v1/questionnaire-responses/${fhirQrId}`,
    payload,
  );
}

export async function deleteFhirQuestionnaireResponse(
  fhirQrId: string,
): Promise<void> {
  return fhirRequest<void>(
    "DELETE",
    `/api/fhir/v1/questionnaire-responses/${fhirQrId}`,
  );
}
