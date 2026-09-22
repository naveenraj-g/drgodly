# Wiring up real auth (`A2UI_AUTH_MODE=jwt`)

`{SERVER_ROOT}/a2ui/auth.ts` ships with two functions, `getIdentity()` and
`getAuthToken()`, that throw when `A2UI_AUTH_MODE=jwt` is set but not yet
implemented. This is a complete, working reference implementation — copy it
in and adapt the URLs/claim names to your actual identity provider. It's
built against [Better Auth](https://www.better-auth.com/) with the JWT
plugin, which is what the reference app (drgodly) uses, but the shape
generalizes to any cookie-session-based auth provider that can mint a bearer
token: sign-in gives you a session cookie, and two endpoints turn that
cookie into (a) the caller's identity and (b) a bearer token to forward
upstream.

## 1. Session-cookie → identity (`getIdentity()`)

Reads the incoming request's session cookie and asks the auth provider who
it belongs to. This only works inside a request context (a route handler,
server action, or server component) — never in a standalone script.

```ts
import { headers } from "next/headers";

export async function getIdentity(): Promise<A2uiIdentity | null> {
  if (AUTH_MODE === "none") return null;

  const hdrs = await headers();
  const res = await fetch(`${process.env.A2UI_AUTH_BASE_URL}/api/auth/get-session`, {
    headers: { cookie: hdrs.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = await res.json();
  return {
    userId: data.user?.id,
    orgId: data.session?.activeOrganizationId,
    permissions: data.session?.permissions,
  };
}
```

## 2. Session-cookie → bearer token (`getAuthToken()`)

Same idea, but asks for a short-lived JWT instead of the session record —
this is the token forwarded as `Authorization: Bearer <token>` to your
backend (see `{API_ROOT}/workflow/_lib.ts`'s `resolveUrl`/fetch calls and
`{API_ROOT}/data-fetch/route.ts`).

```ts
import { headers } from "next/headers";

export async function getAuthToken(): Promise<string | undefined> {
  if (AUTH_MODE === "none") return undefined;

  const hdrs = await headers();
  const res = await fetch(`${process.env.A2UI_AUTH_TOKEN_URL}`, {
    headers: { cookie: hdrs.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch token: ${res.status}`);

  const data = await res.json();
  const token: string | undefined = data.token ?? data.jwt ?? data.access_token;
  if (!token) throw new Error("Token not found in auth response");
  return token;
}
```

Only forward the `cookie` header, not every incoming header — forwarding
things like `connection`/`content-length` from the original request causes
`fetch failed` errors in Node's undici client.

## 3. Verifying a bearer token directly (no cookie — e.g. a mobile client)

If a caller presents `Authorization: Bearer <token>` directly (no session
cookie — typical for a mobile app or service-to-service call), verify it
locally against your IAM's **JWKS** endpoint instead of round-tripping to
a `/get-session` endpoint. This is the piece that answers "what's the JWKS
URL for" — it lets you verify a token's signature without calling the auth
server on every request.

```ts
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";

export interface BearerTokenClaims {
  userId: string;
  orgId?: string;
  payload: JWTPayload;
}

// createRemoteJWKSet caches and rotates keys internally — keep this a
// module-level singleton, never re-create it per request.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) {
    const jwksUrl = process.env.A2UI_AUTH_JWKS_URL;
    if (!jwksUrl) throw new Error("A2UI_AUTH_JWKS_URL is not configured");
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwks;
}

export async function verifyBearerToken(req: NextRequest): Promise<BearerTokenClaims> {
  const authHeader = req.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) throw new Error("Missing or malformed Authorization header");

  const { payload } = await jwtVerify(token, getJwks());
  if (!payload.sub) throw new Error("Token has no subject claim");

  return {
    userId: payload.sub,
    orgId: typeof payload.activeOrganizationId === "string" ? payload.activeOrganizationId : undefined,
    payload,
  };
}
```

Requires the `jose` package (`npm install jose`). Better Auth's JWT plugin
signs `session.user` by default with `sub` set to the user id — `sub` is
reliable, but any other claim (like an org id) depends on your provider's
`jwt.definePayload` configuration, so treat everything beyond `sub` as
optional until you've confirmed it against your actual IAM setup.

## Env vars this pattern introduces

None of these are read by the engine unless you add the code above — they're
your own naming choice, but these are sensible defaults consistent with the
rest of the engine's `A2UI_*` convention:

| Var | Purpose |
|---|---|
| `A2UI_AUTH_MODE` | `"none"` (default) or `"jwt"` — already read by `auth.ts` |
| `A2UI_AUTH_BASE_URL` | Base URL of your auth provider (session lookup) |
| `A2UI_AUTH_TOKEN_URL` | Endpoint that mints a bearer token from a session cookie |
| `A2UI_AUTH_JWKS_URL` | JWKS endpoint for local bearer-token verification (only needed if you verify tokens directly, e.g. for mobile/service callers) |
