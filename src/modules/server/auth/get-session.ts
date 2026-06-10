/**
 * Server-side session resolver.
 *
 * Fetches the active Better Auth session for the current request by forwarding
 * the incoming cookie header to the Better Auth session endpoint.
 * Returns null when no valid session exists (unauthenticated requests).
 */

import axios from "axios";
import { headers } from "next/headers";
import { AuthResponse } from "./types";

/**
 * Retrieves the current user session from Better Auth.
 * Must only be called from server-side code (Server Components, Server Actions, API routes).
 *
 * @returns The authenticated session and user, or null if not signed in.
 */
export async function getServerSession(): Promise<AuthResponse | null> {
  const hdrs = await headers();

  // Forward only the cookie header so Better Auth can identify the session.
  const cookie = hdrs.get("cookie") ?? "";

  try {
    const res = await axios.get<AuthResponse>(
      `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth/get-session`,
      { headers: { cookie } }
    );
    return res.data;
  } catch {
    // Any error (network, 4xx, 5xx) is treated as no session.
    return null;
  }
}
