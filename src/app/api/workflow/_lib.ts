/**
 * Shared utilities for the /api/workflow route family.
 *
 * Layer: app / api / workflow
 *
 * All three routes (route.ts, step/route.ts, submit/route.ts) import from here
 * to avoid duplicating token fetching, URL interpolation, and data-mapping logic.
 *
 * Token strategy: every server-side request to the FHIR server or the external
 * agent uses a short-lived JWT obtained from Better Auth's JWT plugin endpoint.
 * The token is fetched fresh per request by forwarding the current session cookie,
 * so it always reflects the caller's identity and expiry.
 */

import type {
  WorkflowStepDefinition,
  StepContextOutput,
  ContextResolverDef,
} from "@/types/workflow";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

// Re-export under the name used throughout the workflow routes.
export { getAuthToken as getJWTToken };

/**
 * Returns workflow steps sorted by sequence_number ascending.
 * The workflow JSON from the external agent makes no ordering guarantee,
 * so we always sort before indexing by position.
 *
 * @param steps - Unsorted workflow step definitions.
 * @returns Steps sorted by sequence_number.
 */
export function sortedSteps(
  steps: WorkflowStepDefinition[],
): WorkflowStepDefinition[] {
  return [...steps].sort((a, b) => a.sequence_number - b.sequence_number);
}

/**
 * Interpolates `$variable` placeholders in a URL template using values from
 * the session context.
 *
 * Example:
 *   template: "$fhir_server_url/patients/$patient_id/identifiers"
 *   context:  { patient_id: 42 }
 *   result:   "https://fhir.example.com/patients/42/identifiers"
 *
 * Unknown keys are replaced with an empty string to avoid leaving raw
 * placeholders in the URL.
 *
 * @param template - URL string with $variable placeholders.
 * @param context  - Key-value map to substitute into the template.
 * @returns Interpolated URL string.
 */
export function resolveUrl(
  template: string,
  context: Record<string, unknown>,
): string {
  const fhirBase = (process.env.FHIR_GQL_URL ?? "").replace(/\/$/, "");
  const merged: Record<string, unknown> = {
    fhir_server_url: fhirBase,
    ...context,
  };
  const resolved = template.replace(/\$(\w+)/g, (_, key) =>
    String(merged[key] ?? ""),
  );

  // Workflow definitions may use bare relative paths (e.g. /api/v1/...) without
  // a $fhir_server_url prefix. Prepend the base URL so fetch gets an absolute URL.
  if (resolved.startsWith("/")) {
    return `${fhirBase}${resolved}`;
  }
  return resolved;
}

/**
 * Maps a FHIR response onto the step's declared output contract.
 *
 * Each entry in `outputs` optionally specifies a `field` — the top-level
 * response key (or dot-notation path) to pluck. When `field` is absent the
 * entire response object is stored under the output key.
 *
 * @param outputs  - Step context output definitions from the workflow JSON.
 * @param response - The raw FHIR API response body.
 * @returns Flat key-value map of extracted output values.
 */
export function extractOutputs(
  outputs: Record<string, StepContextOutput>,
  response: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(outputs)) {
    if (!def.field) {
      result[key] = response;
    } else {
      // Dot-notation path support: "me_patient.id" traverses nested objects.
      const value = def.field
        .split(".")
        .reduce<unknown>(
          (acc, k) =>
            acc != null && typeof acc === "object"
              ? (acc as Record<string, unknown>)[k]
              : undefined,
          response,
        );
      // Skip undefined so an output absent from one response doesn't overwrite
      // a value already set by a different call.
      if (value !== undefined) result[key] = value;
    }
  }
  return result;
}

/**
 * Strips empty, null, and undefined values from form data before sending to
 * the FHIR server. Optional fields left blank by the user should not be
 * included in the request body.
 *
 * @param data - Raw form data from the client.
 * @returns Cleaned payload with empty/null/NaN values removed.
 */
export function cleanFormData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      value !== "" &&
      value !== undefined &&
      value !== null &&
      !(typeof value === "number" && isNaN(value))
    ) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Runs multiple context resolvers in parallel and merges all results into a
 * single flat object.
 *
 * @param resolvers      - Array of resolver definitions from the workflow step.
 * @param sessionContext - Current accumulated session context.
 * @param token          - Bearer JWT to authenticate FHIR requests.
 * @returns Merged key-value map from all resolver responses.
 */
export async function runContextResolvers(
  resolvers: ContextResolverDef[],
  sessionContext: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown>> {
  const results = await Promise.all(
    resolvers.map((r) => runContextResolver(r, sessionContext, token)),
  );
  return Object.assign({}, ...results);
}

/**
 * Executes a single step context resolver — a preliminary GET (or POST) against
 * the FHIR server to hydrate the latest resource state before the form is shown.
 *
 * @param resolver       - Resolver definition from the workflow step.
 * @param sessionContext - Current accumulated session context (used for URL interpolation).
 * @param token          - Bearer JWT to authenticate the request.
 * @returns Resolver response, optionally nested under context_key.
 * @throws Error if the FHIR server returns a non-2xx status.
 */
export async function runContextResolver(
  resolver: NonNullable<WorkflowStepDefinition["context_resolver"]>,
  sessionContext: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown>> {
  const url = resolveUrl(resolver.url, sessionContext);
  const res = await fetch(url, {
    method: resolver.method,
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: resolver.timeout_ms
      ? AbortSignal.timeout(resolver.timeout_ms)
      : undefined,
  });
  if (!res.ok) throw new Error(`Context resolver failed: ${res.status}`);
  const body = await res.json();
  return resolver.context_key ? { [resolver.context_key]: body } : body;
}
