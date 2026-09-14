/**
 * GET /api/intake/get-by-id?id={id} — mobile REST endpoint for fetching one intake.
 *
 * Layer: app / api / intake
 *
 * Mirrors getIntakeByIdAction (ZSA). Authenticates via bearer JWT — see
 * verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { getIntakeByIdController } from "@/modules/server/core/intake/interface-adapters/controllers";

/**
 * Fetches a single intake by its local integer ID.
 *
 * @param req - Query param: `id`.
 * @returns 200 with the Intake record, or an error response.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const idParam = req.nextUrl.searchParams.get("id");
    // Number(null/"") is 0, not NaN — the ternary keeps a missing param
    // failing the controller's positive-int check instead of resolving id=0.
    const id = idParam ? Number(idParam) : NaN;
    const data = await getIntakeByIdController({ id });
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/intake/get-by-id]");
  }
}
