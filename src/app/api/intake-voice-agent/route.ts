/**
 * Intake voice-agent token endpoint.
 *
 * Route: GET /api/intake-voice-agent?patient_context=...
 *
 * Returns a short-lived JWT (via getAuthToken) and the resolved WebSocket URL
 * for the voice agent. Keeps INTAKE_VOICE_AGENT_URL server-only — the browser
 * only ever receives the ws(s):// form and a signed token.
 *
 * An optional `patient_context` query param (the same "[Patient context: ...]"
 * string used to prime the text intake/consultation agents — see
 * buildPatientContextPrefix in shared/helper.ts) is forwarded onto the
 * returned wsUrl as a query param, so the voice agent can read the patient's
 * known name/age/contact at connection time instead of asking for it again.
 *
 * Response: { token: string; wsUrl: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Converts an http(s):// URL to its ws(s):// equivalent and appends /audio.
 *
 * @param httpUrl - Base URL from INTAKE_VOICE_AGENT_URL env var.
 * @param patientContext - Optional patient context string to carry as a query param.
 * @returns WebSocket endpoint URL with /audio path appended.
 */
function toWsUrl(httpUrl: string, patientContext: string | null): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  // Normalise: strip trailing slash then append /audio
  url.pathname = url.pathname.replace(/\/$/, "") + "/ws/audio";
  if (patientContext) {
    url.searchParams.set("patient_context", patientContext);
  }
  return url.toString();
}

/**
 * GET /api/intake-voice-agent
 *
 * Mints a short-lived JWT and resolves the WebSocket URL for the voice agent.
 *
 * @param req - Incoming GET, optionally carrying ?patient_context=...
 * @returns JSON { token, wsUrl } on success, or 500 if misconfigured.
 */
export async function GET(req: NextRequest) {
  try {
    const agentUrl = process.env.INTAKE_VOICE_AGENT_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "INTAKE_VOICE_AGENT_URL is not configured" },
        { status: 500 },
      );
    }

    const patientContext = req.nextUrl.searchParams.get("patient_context");
    const token = await getAuthToken();
    const wsUrl = toWsUrl(agentUrl, patientContext);

    return NextResponse.json({ token, wsUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("Failed to fetch agent token") ||
      message.includes("JWT token not found")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[intake-voice-agent] token error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
