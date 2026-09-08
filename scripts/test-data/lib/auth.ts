/**
 * Auth for the seed script.
 *
 * Mirrors src/modules/server/auth/jwt-token.ts's flow, but starting from a fresh
 * email/password sign-in instead of forwarding an existing browser cookie — this
 * script has no Next.js request to read cookies from, so it performs the same
 * login → session cookie → JWT chain a browser session would.
 */

import axios from "axios";

export interface AuthConfig {
  betterAuthUrl: string;
  email: string;
  password: string;
}

/** Signs in with email/password, then exchanges the session cookie for a JWT. */
export async function getJwt({ betterAuthUrl, email, password }: AuthConfig): Promise<string> {
  const signInRes = await axios.post(
    `${betterAuthUrl}/api/auth/sign-in/email`,
    { email, password },
    { validateStatus: () => true },
  );
  if (signInRes.status >= 400) {
    throw new Error(
      `Better Auth sign-in failed (${signInRes.status}): ${JSON.stringify(signInRes.data)}\n` +
        `Check SEED_DOCTOR_EMAIL/SEED_DOCTOR_PASSWORD in your env file.`,
    );
  }

  const setCookie = signInRes.headers["set-cookie"];
  if (!setCookie?.length) {
    throw new Error("Better Auth sign-in succeeded but returned no session cookie.");
  }
  // Forward only the cookie pairs, not their attributes (Path/HttpOnly/etc.) — same
  // shape jwt-token.ts forwards from an incoming browser request.
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");

  const tokenRes = await axios.get(`${betterAuthUrl}/api/auth/token`, {
    headers: { cookie },
    validateStatus: () => true,
  });
  if (tokenRes.status >= 400) {
    throw new Error(
      `Better Auth token fetch failed (${tokenRes.status}): ${JSON.stringify(tokenRes.data)}`,
    );
  }

  const token: string | undefined =
    tokenRes.data?.token ?? tokenRes.data?.jwt ?? tokenRes.data?.access_token;
  if (!token) {
    throw new Error("Better Auth /api/auth/token response had no token/jwt/access_token field.");
  }
  return token;
}
