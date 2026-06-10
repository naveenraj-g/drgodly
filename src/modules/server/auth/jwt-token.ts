/**
 * JWT token resolver for server-to-server calls.
 *
 * Retrieves a short-lived JWT from Better Auth that server-side code can attach
 * as a Bearer token when calling external services (e.g. the orchestrator).
 * The token is fetched fresh on every call — it must never be cached.
 */

import axios from "axios";
import { headers } from "next/headers";

/**
 * Fetches a JWT from Better Auth by forwarding the current request headers.
 * Must only be called from server-side code.
 *
 * @returns A JWT string ready to use as `Authorization: Bearer <token>`.
 * @throws Error if the auth endpoint is unreachable or returns no token.
 */
export async function getAuthToken(): Promise<string> {
  const hdrs = await headers();

  // Convert the Next.js Headers object into a plain record for axios.
  const headersObj: Record<string, string> = {};
  hdrs.forEach((value, key) => {
    headersObj[key] = value;
  });

  const res = await axios.get<Record<string, unknown>>(
    `${process.env.BETTER_AUTH_URL}/api/auth/token`,
    { headers: headersObj }
  );

  // Better Auth may return the token under different keys depending on configuration.
  const token =
    res.data.token ?? res.data.jwt ?? res.data.access_token;

  if (typeof token !== "string" || !token) {
    throw new Error("JWT token not found in auth response");
  }

  return token;
}
