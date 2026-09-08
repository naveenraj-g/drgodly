/**
 * /api/document-agent — proxy to the document-chat agent microservice.
 *
 * Layer: app / api
 *
 * Mirrors /api/mcp-agent: the browser cannot call the agent microservice
 * directly (no CORS, and it needs a bearer token the browser doesn't have),
 * so this route mints the token server-side via getAuthToken() and streams
 * the upstream response straight back through, byte for byte.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

/**
 * Forwards a document-chat request to DOCUMENT_AGENT_API_URL and streams the
 * response back to the browser.
 *
 * @param req - Body is `{ file_id, message, patient_id, session_id }`, passed through unchanged.
 * @returns The upstream's streamed body, or a JSON error if the request could not be made.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const body = await req.json();
    const agentUrl = process.env.DOCUMENT_AGENT_API_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "DOCUMENT_AGENT_API_URL is not configured" },
        { status: 500 },
      );
    }

    const upstream = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Agent request failed" },
        { status: upstream.status },
      );
    }

    if (!upstream.body) {
      return NextResponse.json({ error: "No response body" }, { status: 500 });
    }

    const responseHeaders: HeadersInit = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    };

    // Forwarded when the agent hands back a session id to continue the
    // conversation across messages — same convention as /api/mcp-agent.
    const sessionId = upstream.headers.get("X-Session-Id");
    if (sessionId) {
      (responseHeaders as Record<string, string>)["X-Session-Id"] = sessionId;
    }

    return new NextResponse(upstream.body, { headers: responseHeaders });
  } catch (err: any) {
    if (err.message?.includes("Failed to fetch agent token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[document-agent] proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
