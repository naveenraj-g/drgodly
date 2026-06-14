/**
 * Intake agent API proxy.
 *
 * Route: POST /api/intake-agent
 *
 * Server-side proxy that forwards a single chat turn from the patient's text
 * intake UI to the external INTAKE_AGENT_URL service and streams the response
 * back to the browser.
 *
 * Why proxy: the intake agent URL and auth token are server-only secrets.
 * This route keeps them out of the client bundle.
 *
 * Request body: { message: string; session_id: string }
 * Response: streamed text/plain from the agent service.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/server/auth/get-session";

/** Environment key for the external intake chat agent. */
const INTAKE_AGENT_URL = process.env.INTAKE_AGENT_URL ?? "";

/**
 * Proxies a single chat message to the intake agent service and streams
 * the agent's response back to the client.
 *
 * @param request - Incoming POST with { message, session_id }.
 * @returns Streamed response from the intake agent.
 */
export async function POST(request: Request) {
  // Auth guard — only authenticated users may call the intake agent
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!INTAKE_AGENT_URL) {
    return NextResponse.json(
      { error: "Intake agent not configured" },
      { status: 503 },
    );
  }

  let body: { message: string; session_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.message || !body.session_id) {
    return NextResponse.json(
      { error: "message and session_id are required" },
      { status: 400 },
    );
  }

  try {
    const agentResponse = await fetch(INTAKE_AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.INTAKE_AGENT_TOKEN
          ? { Authorization: `Bearer ${process.env.INTAKE_AGENT_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        message: body.message,
        session_id: body.session_id,
      }),
    });

    if (!agentResponse.ok) {
      return NextResponse.json(
        { error: "Intake agent error" },
        { status: agentResponse.status },
      );
    }

    // Stream the agent response through to the client
    return new Response(agentResponse.body, {
      headers: {
        "Content-Type": agentResponse.headers.get("Content-Type") ?? "text/plain",
        "X-Session-Id": body.session_id,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach intake agent" },
      { status: 502 },
    );
  }
}
