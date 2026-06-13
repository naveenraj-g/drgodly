/**
 * handlePatientApiError — shared AxiosError → domain error mapper for Patient REST services.
 *
 * Layer: infrastructure / services / rest (shared utility)
 *
 * Extracted as a standalone function because it has no dependency on `this` or any
 * class state. All 10 Patient sub-service classes import and call it directly.
 *
 * FastAPI returns error details in `body.detail` (not `body.message`).
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
 * Maps an AxiosError from the fhir-gql API to the appropriate domain error and throws it.
 * Return type `never` tells TypeScript this always throws so callers need no follow-up throw.
 *
 * @param error - The AxiosError thrown on non-2xx responses.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | ConflictError | RateLimitError | BadGatewayError
 */
export function handlePatientApiError(error: AxiosError): never {
  const body = error.response?.data as Record<string, unknown> | undefined;
  const message =
    typeof body?.detail === "string"
      ? body.detail
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
      throw new BadGatewayError(
        `fhir-gql error ${error.response?.status ?? "unknown"}: ${message}`,
      );
  }
}
