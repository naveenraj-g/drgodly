/**
 * POST /api/data-fetch
 *
 * Layer: app / api / data-fetch
 *
 * Generic server-side proxy used by the A2UI DataTable component to fetch
 * paginated / filtered data from your backend, with a bearer token attached
 * when auth is enabled. Keeps the token and backend base URL out of the browser.
 *
 * Request body:
 *   {
 *     url:          string,                     // absolute URL or path (auto-prefixed with A2UI_BACKEND_URL)
 *     queryParams?: Record<string, unknown>,    // appended as query string
 *     dataPath?:    string,                     // dot-path to the row array  e.g. "entry", "data.items"
 *     totalPath?:   string,                     // dot-path to the total count e.g. "total", "meta.total"
 *   }
 *
 * Response:
 *   { rows: unknown[], total: number, raw: unknown }
 */

import { getAuthToken, getIdentity } from "@/lib/a2ui/auth";

const AUTH_MODE = process.env.A2UI_AUTH_MODE ?? "none";

/**
 * Traverses a dot-notation path on an object.
 *
 * @param obj  - Source object.
 * @param path - Dot-separated key path e.g. "meta.total".
 * @returns The value at the path, or undefined if any segment is missing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAtPath(obj: any, path: string): any {
  if (!path) return obj;
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

/**
 * Extracts the row array from the API response.
 * Tries `dataPath` first, then a list of common key names.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRows(raw: any, dataPath?: string): unknown[] {
  if (dataPath) {
    const val = getAtPath(raw, dataPath);
    return Array.isArray(val) ? val : [];
  }
  if (Array.isArray(raw)) return raw;
  for (const key of ["data", "items", "results", "entry", "records", "rows"]) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }
  return [];
}

/**
 * Extracts the total count from the API response.
 * Tries `totalPath` first, then common key names and nested meta fields.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTotal(raw: any, totalPath?: string, rowCount = 0): number {
  if (totalPath) {
    const val = getAtPath(raw, totalPath);
    return typeof val === "number" ? val : Number(val) || rowCount;
  }
  for (const key of ["total", "count", "totalCount", "total_count"]) {
    if (typeof raw?.[key] === "number") return raw[key];
  }
  return getAtPath(raw, "meta.total") ?? getAtPath(raw, "meta.count") ?? rowCount;
}

/**
 * Fetches data from your backend and normalises the response to rows + total.
 *
 * @param req - POST request with { url, queryParams?, dataPath?, totalPath? } body.
 * @returns Normalised { rows, total, raw } response.
 */
export async function POST(req: Request) {
  const { url, queryParams = {}, dataPath, totalPath } = await req.json();

  if (!url) {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  const identity = await getIdentity();
  // Only actually gate on identity once auth is enabled — with
  // A2UI_AUTH_MODE=none (the default), identity is always null and this
  // route must still work.
  if (AUTH_MODE !== "none" && !identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getAuthToken();

  // Relative paths are prefixed with A2UI_BACKEND_URL automatically.
  const resolvedUrl = url.startsWith("/")
    ? `${process.env.A2UI_BACKEND_URL ?? ""}${url}`
    : url;

  /* Whenever a UI schema's queryParams declares an org_id key (tenant-scoped
     tables), override it with the caller's own identity org_id — never
     trust a value that travelled through the browser. Tables that don't
     filter by org_id at all are left untouched. */
  const resolvedQueryParams: Record<string, unknown> = { ...queryParams };
  if ("org_id" in resolvedQueryParams) {
    resolvedQueryParams.org_id = identity?.orgId ?? undefined;
  }

  const params = new URLSearchParams(
    Object.entries(resolvedQueryParams)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );

  const fullUrl = params.toString() ? `${resolvedUrl}?${params}` : resolvedUrl;

  const upstream = await fetch(fullUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    },
  });

  if (!upstream.ok) {
    return Response.json(
      { error: `Upstream error: ${upstream.status} ${upstream.statusText}` },
      { status: upstream.status },
    );
  }

  const raw = await upstream.json();
  const rows = extractRows(raw, dataPath);
  const total = extractTotal(raw, totalPath, rows.length);

  return Response.json({ rows, total, raw });
}
