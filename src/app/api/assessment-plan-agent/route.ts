/**
 * Assessment plan agent API proxy.
 *
 * Route: POST /api/assessment-plan-agent
 *
 * Forwards the completed intake conversation transcript to the external
 * ASSESSMENT_PLAN_AGENT_URL service and returns the AI-generated clinical
 * assessment report as JSON.
 *
 * Called once at the end of a text intake session to produce the report
 * before saving to the local database.
 *
 * Request body: { conversation: { role: string; content: string }[] }
 * Response: JSON report with clinical_overview, risk_level,
 *   differential_diagnosis, diagnostic_plan, treatment_plan, red_flags.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/server/auth/get-session";

/** Environment key for the external assessment plan agent. */
const ASSESSMENT_PLAN_AGENT_URL = process.env.ASSESSMENT_PLAN_AGENT_URL ?? "";

/**
 * Sends the full conversation transcript to the assessment agent and returns
 * the clinical report JSON.
 *
 * @param request - Incoming POST with { conversation }.
 * @returns JSON report from the assessment agent.
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ASSESSMENT_PLAN_AGENT_URL) {
    return NextResponse.json(
      { error: "Assessment plan agent not configured" },
      { status: 503 },
    );
  }

  let body: { conversation: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(body.conversation) || body.conversation.length === 0) {
    return NextResponse.json(
      { error: "conversation array is required and must not be empty" },
      { status: 400 },
    );
  }

  try {
    const agentResponse = await fetch(ASSESSMENT_PLAN_AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ASSESSMENT_PLAN_AGENT_TOKEN
          ? { Authorization: `Bearer ${process.env.ASSESSMENT_PLAN_AGENT_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ conversation: body.conversation }),
    });

    if (!agentResponse.ok) {
      return NextResponse.json(
        { error: "Assessment agent error" },
        { status: agentResponse.status },
      );
    }

    // Parse and forward the report JSON
    const report = await agentResponse.json();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach assessment agent" },
      { status: 502 },
    );
  }
}
