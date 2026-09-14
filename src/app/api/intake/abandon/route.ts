/**
 * POST /api/intake/abandon — mobile REST endpoint for abandoning an in-progress intake.
 *
 * Layer: app / api / intake
 *
 * Mirrors abandonIntakeAction (ZSA). Called when the patient navigates away
 * without completing. Authenticates via bearer JWT — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { abandonIntakeController } from "@/modules/server/core/intake/interface-adapters/controllers";

/**
 * Marks an in-progress intake as ABANDONED.
 *
 * @param req - Body: `{ id }`.
 * @returns 200 with the updated Intake record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const body = await req.json();
    const data = await abandonIntakeController(body);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/intake/abandon]");
  }
}
