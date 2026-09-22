/**
 * a2ui/auth — pluggable identity + bearer-token resolution.
 *
 * Layer: server / a2ui
 *
 * Every workflow API route and the data-fetch proxy call these two functions
 * instead of talking to an auth provider directly, so the whole A2UI engine
 * runs with zero auth configured (the default) and can be upgraded to real
 * JWT-based auth later without touching any route.
 *
 * Two modes, selected by A2UI_AUTH_MODE:
 *   "none" (default) — getIdentity() returns null, getAuthToken() returns
 *                       undefined. Every workflow runs unauthenticated, with
 *                       no user_id/org_id seeded into session context and no
 *                       Authorization header sent upstream. Fine for local
 *                       development or a backend that doesn't require auth.
 *   "jwt"             — you implement real session lookup + token minting
 *                       below. See ../../references/auth-jwt-example.md for
 *                       a complete, working example (Better Auth + a JWT
 *                       plugin) to copy from and adapt to your own provider.
 *
 * Nothing here is provider-specific on purpose — every real auth system's
 * "who is the current user" call is different (cookies vs. headers vs.
 * server-side session store), so this file is the one seam you edit rather
 * than a dozen call sites.
 */

export interface A2uiIdentity {
  /** Stable id of the signed-in user, seeded into workflow context as $user_id. */
  userId?: string;
  /** Active tenant/organization id, seeded into workflow context as $org_id. */
  orgId?: string;
  /** Permission strings checked against a workflow's required_permissions. */
  permissions?: string[];
}

const AUTH_MODE = process.env.A2UI_AUTH_MODE ?? "none";

/**
 * Resolves the current caller's identity for the incoming request.
 * Returns null when unauthenticated or when auth is disabled.
 *
 * @returns The caller's identity, or null.
 */
export async function getIdentity(): Promise<A2uiIdentity | null> {
  if (AUTH_MODE === "none") return null;

  // --- A2UI_AUTH_MODE=jwt: implement real session lookup here ---
  // A typical shape (see references/auth-jwt-example.md):
  //
  //   const hdrs = await headers();
  //   const res = await fetch(`${process.env.A2UI_AUTH_BASE_URL}/session`, {
  //     headers: { cookie: hdrs.get("cookie") ?? "" },
  //     cache: "no-store",
  //   });
  //   if (!res.ok) return null;
  //   const data = await res.json();
  //   return { userId: data.user.id, orgId: data.session.activeOrganizationId, permissions: data.session.permissions };
  throw new Error(
    "A2UI_AUTH_MODE=jwt requires getIdentity() to be implemented in server/a2ui/auth.ts — see references/auth-jwt-example.md",
  );
}

/**
 * Resolves a bearer token to attach to outgoing requests to your backend.
 * Returns undefined when unauthenticated or when auth is disabled — callers
 * must handle a missing token gracefully (omit the Authorization header).
 *
 * @returns A bearer token, or undefined.
 */
export async function getAuthToken(): Promise<string | undefined> {
  if (AUTH_MODE === "none") return undefined;

  // --- A2UI_AUTH_MODE=jwt: implement real token minting here ---
  // A typical shape (see references/auth-jwt-example.md):
  //
  //   const hdrs = await headers();
  //   const res = await fetch(`${process.env.A2UI_AUTH_TOKEN_URL}`, {
  //     headers: { cookie: hdrs.get("cookie") ?? "" },
  //     cache: "no-store",
  //   });
  //   if (!res.ok) throw new Error(`Failed to mint token: ${res.status}`);
  //   const data = await res.json();
  //   return data.token ?? data.jwt ?? data.access_token;
  throw new Error(
    "A2UI_AUTH_MODE=jwt requires getAuthToken() to be implemented in server/a2ui/auth.ts — see references/auth-jwt-example.md",
  );
}
