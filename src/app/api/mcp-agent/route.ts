import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const body = await req.json();
    const agentUrl = process.env.MCP_AGENT_URL;

    if (!agentUrl) {
      return NextResponse.json(
        { error: "MCP_AGENT_URL is not configured" },
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

    const sessionId = upstream.headers.get("X-Session-Id");
    if (sessionId) {
      (responseHeaders as Record<string, string>)["X-Session-Id"] = sessionId;
    }

    return new NextResponse(upstream.body, { headers: responseHeaders });
  } catch (err: any) {
    if (err.message?.includes("Failed to fetch agent token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[mcp-agent] proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
