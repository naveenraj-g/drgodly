/**
 * handleTaskApiError — Axios → domain error mapper for Task REST services.
 *
 * Layer: infrastructure / services / rest (shared utility)
 *
 * Thin wrapper around the shared handleFhirApiError.
 */

import { AxiosError } from "axios";
import { handleFhirApiError } from "@/modules/server/shared/errors/handleFhirApiError";

/**
 * Maps an AxiosError from the fhir-gql Task API to a typed domain error and throws it.
 * Return type `never` tells TypeScript this always throws so callers need no follow-up throw.
 *
 * @param error - The AxiosError thrown on non-2xx responses.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError |
 *         ConflictError | RateLimitError | BadGatewayError
 */
export function handleTaskApiError(error: AxiosError): never {
  handleFhirApiError(error, "Task");
}
