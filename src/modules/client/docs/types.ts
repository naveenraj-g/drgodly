/**
 * Shared content types for the /docs/mobile-guide reference site.
 *
 * Layer: client / docs
 *
 * Every FHIR resource page and every AI agent page is rendered generically
 * from one of these shapes (see fhirResources.data.ts / agents.data.ts) by a
 * single [resource]/page.tsx or [agent]/page.tsx template — new resources or
 * agents are added by extending the data file, not by writing new JSX.
 */

/** One HTTP endpoint on a FHIR resource or the mobile API. */
export interface EndpointDoc {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Path relative to the resource's base URL, e.g. "/{id}" or "" for the collection root. */
  path: string;
  summary: string;
  /** Free-form notes: quirks, required scoping, side effects. */
  notes?: string;
  /** Query params for GET endpoints (list/search). */
  queryParams?: { name: string; type: string; required?: boolean; description: string }[];
  /** JSON body example for POST/PATCH/PUT. Omit for GET/DELETE. */
  requestExample?: unknown;
  /** JSON response body example. */
  responseExample: unknown;
}

/** One FHIR (or FHIR-staging) resource's full reference page content. */
export interface ResourceDoc {
  slug: string;
  title: string;
  /** e.g. "/patients" — appended to FHIR_GQL_URL to form the base URL. */
  basePath: string;
  description: string;
  usage: { patient?: string; doctor?: string };
  endpoints: EndpointDoc[];
}

/** One streaming or plain-JSON event shape emitted by an agent. */
export interface AgentEventDoc {
  type: string;
  description: string;
  example: unknown;
}

/** One AI agent's full reference page content. */
export interface AgentDoc {
  slug: string;
  title: string;
  /** Env var naming the upstream agent URL, e.g. "INTAKE_AGENT_URL". */
  envVar: string;
  exampleUrl: string;
  description: string;
  usage: { patient?: string; doctor?: string };
  method: "GET" | "POST";
  /** Path the mobile app calls directly on the agent host (not our Next.js proxy). */
  path: string;
  /** "multipart/form-data" for file uploads, otherwise omitted (application/json assumed). */
  contentType?: string;
  /** Free-form caveat: payload-shape inconsistencies, scoping requirements, etc. */
  notes?: string;
  requestExample: unknown;
  streaming: boolean;
  /** Only for streaming: every distinct event type this agent emits. */
  events?: AgentEventDoc[];
  /** Only for non-streaming: the plain JSON response shape. */
  responseExample?: unknown;
  /** Whether the response carries a session id to thread across turns, and how. */
  sessionContinuity?: string;
}
