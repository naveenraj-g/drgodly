/**
 * POST /api/workflow/dynamic-select
 *
 * Layer: app / api / workflow / dynamic-select
 *
 * Server-side proxy for the DynamicSelect A2UI catalog component. The
 * component runs in the browser and cannot reach your backend directly (or
 * hold its bearer token), so it calls this route instead. The route:
 *   1. Resolves the URL template (e.g. "$backend_url/practitioners/")
 *      using the A2UI_BACKEND_URL env var — the same logic used by other
 *      workflow routes.
 *   2. Validates the resolved URL against the allowed backend origin to
 *      prevent SSRF.
 *   3. Appends caller-supplied query params (static context values + live search term).
 *   4. Makes a GET request, with a bearer token attached when auth is enabled.
 *   5. Extracts the items array from the response using the caller's responsePath,
 *      then returns { items: unknown[] }.
 *
 * Note: Only $backend_url is resolved in the URL template because the
 * session context is client-side. Dynamic path segments (e.g. $patient_id)
 * should be passed via staticParams in the schema instead.
 */

import { getAuthToken, getIdentity } from "@/lib/a2ui/auth";
import { resolveUrl } from "../_lib";

/** Backend base URL, used for SSRF validation. Mirrors what resolveUrl injects. */
const BACKEND_BASE = (process.env.A2UI_BACKEND_URL ?? "").replace(/\/$/, "");
const AUTH_MODE = process.env.A2UI_AUTH_MODE ?? "none";

/**
 * Traverses a dot-separated path (e.g. "data" or "results.items") into a JSON value.
 *
 * @param obj  - The parsed JSON response body.
 * @param path - Dot-notation path. Empty string means return the root value.
 * @returns The nested value, or undefined when the path does not exist.
 */
function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    if (Array.isArray(acc)) {
      const idx = parseInt(key, 10);
      return isNaN(idx) ? undefined : acc[idx];
    }
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Proxies a DynamicSelect search query to your backend.
 *
 * @param req - POST request with JSON body { url, params, responsePath }.
 * @returns JSON { items: unknown[] } or an error response.
 */
export async function POST(req: Request) {
  const identity = await getIdentity();

  // Only actually gate on identity once auth is enabled — with
  // A2UI_AUTH_MODE=none (the default), identity is always null and this
  // route must still work.
  if (AUTH_MODE !== "none" && !identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    url?: string;
    params?: Record<string, string>;
    responsePath?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, params: rawParams = {}, responsePath = "" } = body;

  // Re-pin org_id to the current identity when the caller's staticParams
  // included one — resolvedStaticParams on the client reads org_id from the
  // workflow's own sessionContext, but this route can't tell a legitimately
  // resolved value from a forged one, so it always overrides with the
  // identity's own org rather than trusting whatever arrived.
  const params = {
    ...rawParams,
    ...(identity?.orgId ? { org_id: identity.orgId } : {}),
  };

  if (!url) {
    return Response.json({ error: "'url' is required" }, { status: 400 });
  }

  // Resolve $backend_url placeholder; unknown $vars become empty string.
  const resolved = resolveUrl(url, {});

  // SSRF guard: only proxy requests to the configured backend origin.
  if (BACKEND_BASE && !resolved.startsWith(BACKEND_BASE)) {
    return Response.json({ error: "URL not allowed" }, { status: 403 });
  }

  const token = await getAuthToken();

  // Build the query string from the caller-supplied params (static + search term).
  const qs = new URLSearchParams(params).toString();
  const fetchUrl = qs ? `${resolved}?${qs}` : resolved;

  try {
    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json(
        { error: `Upstream error: ${res.status}` },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();

    // Extract the items array from the response using the schema-declared path.
    // An empty responsePath means the root of the response is the array itself.
    const extracted = resolvePath(data, responsePath);
    const items = Array.isArray(extracted) ? extracted : [];

    return Response.json({ items });
  } catch (error) {
    console.error("[workflow/dynamic-select] Fetch failed:", error);
    return Response.json({ error: "Search request failed" }, { status: 500 });
  }
}
