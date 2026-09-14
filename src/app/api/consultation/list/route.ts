/**
 * GET /api/consultation/list — mobile REST endpoint for the paginated consultation list.
 *
 * Layer: app / api / consultation
 *
 * Mirrors listConsultationsAction (ZSA). All filters are optional query
 * params; omitting them returns the full table. Authenticates via bearer
 * JWT — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { listConsultationsController } from "@/modules/server/core/consultation/interface-adapters/controllers";

/**
 * Returns a paginated list of consultation records, filtered by the given query params.
 *
 * @param req - Query params: `user_id?, org_id?, status?, limit?, offset?`.
 * @returns 200 with the paginated Consultation list, or an error response.
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
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };
    const data = await listConsultationsController(payload);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/consultation/list]");
  }
}
