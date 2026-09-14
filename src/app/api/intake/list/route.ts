/**
 * GET /api/intake/list — mobile REST endpoint for the paginated intake list.
 *
 * Layer: app / api / intake
 *
 * Mirrors listIntakesAction (ZSA). All filters are optional query params;
 * omitting them returns the full table. Authenticates via bearer JWT — see
 * verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { listIntakesController } from "@/modules/server/core/intake/interface-adapters/controllers";

/**
 * Returns a paginated list of intake records, filtered by the given query params.
 *
 * @param req - Query params: `user_id?, org_id?, status?, mode?, limit?, offset?`.
 * @returns 200 with the paginated Intake list, or an error response.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const sp = req.nextUrl.searchParams;
    const limit = sp.get("limit");
    const offset = sp.get("offset");
    const payload = {
      user_id: sp.get("user_id") ?? undefined,
      org_id: sp.get("org_id") ?? undefined,
      status: sp.get("status") ?? undefined,
      mode: sp.get("mode") ?? undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };
    const data = await listIntakesController(payload);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/intake/list]");
  }
}
