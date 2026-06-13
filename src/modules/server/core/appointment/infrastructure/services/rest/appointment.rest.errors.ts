/**
 * Appointment REST API error mapper.
 *
 * Layer: server / core / appointment / infrastructure / services / rest
 *
 * Maps an AxiosError from fhir-gql to the appropriate domain error and throws.
 * Imported by AppointmentCoreRestService.
 *
 * Note: fhir-gql uses FastAPI — error detail lives in body?.detail, not body?.message.
 * 409 is treated as a slot-conflict (slot claimed by another booking between reserve and confirm).
 */

import { AxiosError } from "axios";
import {
  BadGatewayError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/modules/server/shared/errors/commonErrors";

/**
 * Maps an AxiosError from fhir-gql to a typed domain error and throws it.
 * Always throws — return type is `never`.
 *
 * @param error - The AxiosError received from the HTTP call.
 * @throws ValidationError    on HTTP 400 / 422
 * @throws UnauthorizedError  on HTTP 401
 * @throws ForbiddenError     on HTTP 403
 * @throws NotFoundError      on HTTP 404
 * @throws ConflictError      on HTTP 409 (slot already booked — race condition)
 * @throws RateLimitError     on HTTP 429
 * @throws BadGatewayError    on all other non-2xx responses
 */
export function handleAppointmentApiError(error: AxiosError): never {
  const body = error.response?.data as Record<string, unknown> | undefined;
  // FastAPI default error format: { detail: "..." }
  const message =
    typeof body?.detail === "string"
      ? body.detail
      : (error.response?.statusText ?? error.message);

  switch (error.response?.status) {
    case 400:
    case 422:
      throw new ValidationError(message);
    case 401:
      throw new UnauthorizedError(message);
    case 403:
      throw new ForbiddenError(message);
    case 404:
      throw new NotFoundError(message);
    case 409:
      // Slot conflict — another booking claimed the slot between selection and confirmation
      throw new ConflictError(message);
    case 429:
      throw new RateLimitError(message);
    default:
      throw new BadGatewayError(
        `Appointment API error ${error.response?.status ?? "unknown"}: ${message}`,
      );
  }
}
