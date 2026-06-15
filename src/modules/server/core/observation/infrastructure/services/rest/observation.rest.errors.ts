/**
 * Observation REST API error mapper.
 *
 * Layer: server / core / observation / infrastructure / services / rest
 *
 * FastAPI error detail lives in body?.detail, not body?.message.
 */

import { AxiosError } from "axios";
import {
  BadGatewayError, ConflictError, ForbiddenError, NotFoundError,
  RateLimitError, UnauthorizedError, ValidationError,
} from "@/modules/server/shared/errors/commonErrors";

/**
 * Maps an AxiosError from fhir-gql to a typed domain error and throws it.
 * Always throws — return type is `never`.
 *
 * @param error - The AxiosError received from the HTTP call.
 * @throws ValidationError on HTTP 400/422, UnauthorizedError on 401,
 *   ForbiddenError on 403, NotFoundError on 404, ConflictError on 409,
 *   RateLimitError on 429, BadGatewayError on all others.
 */
export function handleObservationApiError(error: AxiosError): never {
  const body = error.response?.data as Record<string, unknown> | undefined;
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
      throw new ConflictError(message);
    case 429:
      throw new RateLimitError(message);
    default:
      throw new BadGatewayError(`Observation API error ${error.response?.status ?? "unknown"}: ${message}`);
  }
}
