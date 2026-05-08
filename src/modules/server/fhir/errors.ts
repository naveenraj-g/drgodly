import { SessionExpiredError } from "@/modules/server/shared/errors/auth/commonAuthErrors";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from "@/modules/server/shared/errors/commonErrors";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";

// Every error response from the FHIR server is a FHIR OperationOutcome:
// { resourceType: "OperationOutcome", issue: [{ severity, code, diagnostics }] }
function extractDiagnostics(data: unknown): string {
  const issue = (data as any)?.issue?.[0];
  return issue?.diagnostics ?? "FHIR request failed";
}

// Maps a failed FHIR HTTP response to the appropriate domain error.
// Thrown errors are all ApplicationError subclasses so mapErrorToZSA handles
// them automatically in runWithTransport.
export function mapFhirError(
  method: string,
  path: string,
  status: number,
  data: unknown,
): never {
  const message = extractDiagnostics(data);

  switch (status) {
    // Input or Pydantic validation failure from FHIR server
    case 400:
    case 422:
      throw new ValidationError(message);

    // JWT was missing, expired, or invalid when our server called FHIR —
    // this means the user's session can no longer produce a valid token.
    case 401:
      throw new SessionExpiredError();

    // Permission denied or resource ownership check failed
    case 403:
      throw new ForbiddenError(message);

    // Resource does not exist on the FHIR server
    case 404:
      throw new NotFoundError(message);

    // Resource conflict (e.g. duplicate resource)
    case 409:
      throw new ConflictError(message);

    // Rate limit hit — caller should retry after the Retry-After window
    case 429:
      throw new RateLimitError();

    // Any 5xx or unexpected status is an infrastructure failure.
    // isOperational: true so it doesn't console.error on every call, but
    // the message is kept generic to avoid leaking server internals.
    default:
      throw new InfrastructureError(
        `FHIR service error [${method} ${path}] ${status}`,
        data,
      );
  }
}
