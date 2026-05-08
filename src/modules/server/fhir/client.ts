import { headers } from "next/headers";
import { SessionExpiredError } from "@/modules/server/shared/errors/auth/commonAuthErrors";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";
import { mapFhirError } from "./errors";

const FHIR_BASE_URL = process.env.FHIR_SERVER_URL!;
const AUTH_URL = process.env.BETTER_AUTH_URL!;

// Fetches a short-lived JWT from Better Auth's JWT plugin endpoint.
// Called server-side so the current session cookie is forwarded automatically.
async function getFhirToken(): Promise<string> {
  const hdrs = await headers();

  const res = await fetch(`${AUTH_URL}/api/auth/token`, {
    method: "GET",
    headers: hdrs,
    cache: "no-store",
  });

  if (!res.ok) {
    // Auth server rejected the session — treat as expired session
    throw new SessionExpiredError();
  }

  const data = await res.json();
  const token: string | undefined = data.token ?? data.jwt ?? data.access_token;

  if (!token) {
    // Auth server responded but returned no token — misconfiguration
    throw new InfrastructureError("FHIR auth token missing from auth server response");
  }

  return token;
}

export async function fhirRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getFhirToken();

  const res = await fetch(`${FHIR_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json();

  if (!res.ok) {
    mapFhirError(method, path, res.status, data);
  }

  return data as T;
}
