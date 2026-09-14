/**
 * POST /api/intake/update — mobile REST endpoint for completing an intake session.
 *
 * Layer: app / api / intake
 *
 * Mirrors updateIntakeAction (ZSA). Saves the conversation transcript and AI
 * report and flips status to COMPLETED. Authenticates via bearer JWT — see
 * verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { updateIntakeController } from "@/modules/server/core/intake/interface-adapters/controllers";

/**
 * Completes an intake session.
 *
 * @param req - Body: `{ id, conversation, report? }`.
 * @returns 200 with the updated Intake record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const body = await req.json();
    const data = await updateIntakeController(body);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/intake/update]");
  }
}
