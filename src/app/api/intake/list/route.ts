/**
 * GET /api/intake/list — mobile REST endpoint for the paginated intake list.
 *
 * Layer: app / api / intake
 *
 * Mirrors listIntakesAction (ZSA). All filters are optional query params;
 * omitting them returns the full table. Authenticates via bearer JWT — see
 * verify-bearer-token.ts.
 *
 * org_id is always taken from the token, never the client. user_id is only
 * trusted from the client when the caller holds a "telemedicine-staff" role
 * (doctor/admin) — everyone else has user_id forced to their own token
 * subject, whatever they supplied or omitted, so a patient caller can never
 * read another patient's intake records by supplying (or omitting) a
 * different user_id. A missing/unrecognized role claim is treated as "not
 * staff" — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { listIntakesController } from "@/modules/server/core/intake/interface-adapters/controllers";
import { ROLES } from "@/modules/server/shared/auth/roles";

/**
 * Returns a paginated list of intake records, filtered by the given query params.
 *
 * @param req - Query params: `user_id?, status?, mode?, limit?, offset?` (org_id is server-injected).
 * @returns 200 with the paginated Intake list, or an error response.
 */
export async function GET(req: NextRequest) {
  try {
    const claims = await verifyBearerToken(req);
    const isStaff =
      !!claims.role &&
      (ROLES["telemedicine-staff"] as readonly string[]).includes(claims.role);

    const sp = req.nextUrl.searchParams;
    const limit = sp.get("limit");
    const offset = sp.get("offset");
    const payload = {
      user_id: isStaff ? (sp.get("user_id") ?? undefined) : claims.userId,
      org_id: claims.orgId,
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
