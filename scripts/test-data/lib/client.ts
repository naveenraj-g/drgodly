/**
 * Thin REST client for the seed script — same base-URL + Bearer-JWT shape every
 * `*RestApiService` in src/modules/server/core/*\/infrastructure/services uses,
 * collapsed into one client instead of one per resource since this script only
 * ever does a plain create/patch per resource.
 */

import axios, { type AxiosInstance } from "axios";

export function createFhirClient(baseUrl: string, jwt: string): AxiosInstance {
  return axios.create({
    baseURL: baseUrl,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    timeout: 15_000,
  });
}

const RESOURCE_PATHS = {
  appointment: "/appointments",
  encounter: "/encounters",
  condition: "/conditions",
  observation: "/observations",
  medicationRequest: "/medication-requests",
  serviceRequest: "/service-requests",
  diagnosticReport: "/diagnostic-reports",
} as const;

export type ResourceKind = keyof typeof RESOURCE_PATHS;

interface CreatedResource {
  id: number;
  [key: string]: unknown;
}

/** POSTs a validated payload to the resource's collection endpoint. */
export async function createResource(
  client: AxiosInstance,
  kind: ResourceKind,
  payload: unknown,
): Promise<CreatedResource> {
  const path = RESOURCE_PATHS[kind];
  const res = await client.post(path, payload, { validateStatus: () => true });
  if (res.status >= 400) {
    throw new Error(
      `POST ${path} failed (${res.status}): ${JSON.stringify(res.data)}\nPayload: ${JSON.stringify(payload)}`,
    );
  }
  return res.data as CreatedResource;
}

/** PATCHes scalar/patchable fields on an existing resource by id. */
export async function patchResource(
  client: AxiosInstance,
  kind: ResourceKind,
  id: number,
  payload: unknown,
): Promise<unknown> {
  const path = `${RESOURCE_PATHS[kind]}/${id}`;
  const res = await client.patch(path, payload, { validateStatus: () => true });
  if (res.status >= 400) {
    throw new Error(`PATCH ${path} failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data;
}
