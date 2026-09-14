/**
 * Bearer JWT verification for the mobile-facing REST API.
 *
 * Layer: server / auth
 *
 * Server actions (procedures.ts → authenticatedProcedure) authenticate via
 * getServerSession(), which forwards the browser's session *cookie* to Better
 * Auth. A mobile app has no cookie — it only ever holds the short-lived JWT
 * Better Auth mints via GET /api/auth/token (the same JWT this app already
 * forwards to the Python agents as `Authorization: Bearer <token>`, see
 * jwt-token.ts). This module verifies that JWT locally against Better Auth's
 * JWKS endpoint instead of looking up a session, so the new /api/{intake,
 * consultation,ai-consultation}/* routes can be called with just a bearer
 * token — no cookie required.
 *
 * Claim shape caveat: Better Auth's JWT plugin defaults to signing
 * `session.user` (id, email, name, ...) with `sub` set to the user id, unless
 * the external IAM service customizes `jwt.definePayload`. `sub` is therefore
 * reliable; `org_id` is not guaranteed to be present in the token and callers
 * should treat it as optional (falling back to a value supplied in the
 * request body) until confirmed against the real IAM config.
 */

import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import { UnauthorizedError } from "@/modules/server/shared/errors/commonErrors";

/** Minimal claims the API routes need out of the verified token. */
export interface BearerTokenClaims {
  /** Better Auth user id — the JWT's `sub` claim. */
  userId: string;
  /** Present only if the IAM's JWT payload includes it — not guaranteed. */
  orgId?: string;
  /** Full decoded payload, for routes that need something beyond userId/orgId. */
  payload: JWTPayload;
}

/**
 * Lazily-created, module-scoped JWKS resolver — `createRemoteJWKSet` caches
 * and rotates keys internally, so this must be a singleton (mirrors the
 * FileNest/Prisma client singleton pattern used elsewhere in this project)
 * rather than being re-created on every request.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const jwksUrl = process.env.BETTER_AUTH_JWKS_URL;
    if (!jwksUrl) {
      throw new Error("BETTER_AUTH_JWKS_URL is not configured");
    }
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwks;
}

/**
 * Verifies the `Authorization: Bearer <token>` header on a mobile API
 * request.
 *
 * @param req - Incoming request to the mobile API route.
 * @returns The verified token's claims.
 * @throws UnauthorizedError if the header is missing or the token is
 *   missing, malformed, expired, or fails signature verification — route
 *   handlers should let this propagate to mobileErrorResponse (401).
 */
export async function verifyBearerToken(
  req: NextRequest,
): Promise<BearerTokenClaims> {
  const authHeader = req.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Missing or malformed Authorization header");
  }

  try {
    const { payload } = await jwtVerify(token, getJwks());
    if (!payload.sub) throw new UnauthorizedError("Token has no subject claim");

    return {
      userId: payload.sub,
      orgId:
        typeof payload.activeOrganizationId === "string"
          ? payload.activeOrganizationId
          : undefined,
      payload,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Invalid or expired token");
  }
}
