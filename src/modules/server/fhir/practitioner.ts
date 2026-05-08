import { fhirRequest } from "./client";
import type {
  FhirPractitionerCreatePayload,
  FhirPractitionerPatchPayload,
  FhirPractitionerResponse,
  FhirPractitionerTelecomPayload,
  FhirPractitionerAddressPayload,
  FhirPractitionerIdentifierPayload,
  FhirPractitionerQualificationPayload,
} from "./types";

export async function createFhirPractitioner(
  payload: FhirPractitionerCreatePayload,
): Promise<FhirPractitionerResponse> {
  return fhirRequest<FhirPractitionerResponse>(
    "POST",
    "/api/fhir/v1/practitioners/",
    payload,
  );
}

export async function updateFhirPractitioner(
  fhirPractitionerId: string,
  payload: FhirPractitionerPatchPayload,
): Promise<FhirPractitionerResponse> {
  return fhirRequest<FhirPractitionerResponse>(
    "PATCH",
    `/api/fhir/v1/practitioners/${fhirPractitionerId}`,
    payload,
  );
}

export async function deleteFhirPractitioner(
  fhirPractitionerId: string,
): Promise<void> {
  return fhirRequest<void>(
    "DELETE",
    `/api/fhir/v1/practitioners/${fhirPractitionerId}`,
  );
}

export async function addFhirPractitionerTelecom(
  fhirPractitionerId: string,
  payload: FhirPractitionerTelecomPayload,
): Promise<FhirPractitionerResponse> {
  return fhirRequest<FhirPractitionerResponse>(
    "POST",
    `/api/fhir/v1/practitioners/${fhirPractitionerId}/telecom`,
    payload,
  );
}

export async function addFhirPractitionerAddress(
  fhirPractitionerId: string,
  payload: FhirPractitionerAddressPayload,
): Promise<FhirPractitionerResponse> {
  return fhirRequest<FhirPractitionerResponse>(
    "POST",
    `/api/fhir/v1/practitioners/${fhirPractitionerId}/addresses`,
    payload,
  );
}

export async function addFhirPractitionerIdentifier(
  fhirPractitionerId: string,
  payload: FhirPractitionerIdentifierPayload,
): Promise<FhirPractitionerResponse> {
  return fhirRequest<FhirPractitionerResponse>(
    "POST",
    `/api/fhir/v1/practitioners/${fhirPractitionerId}/identifiers`,
    payload,
  );
}

export async function addFhirPractitionerQualification(
  fhirPractitionerId: string,
  payload: FhirPractitionerQualificationPayload,
): Promise<FhirPractitionerResponse> {
  return fhirRequest<FhirPractitionerResponse>(
    "POST",
    `/api/fhir/v1/practitioners/${fhirPractitionerId}/qualifications`,
    payload,
  );
}
