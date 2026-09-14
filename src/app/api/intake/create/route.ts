/**
 * POST /api/intake/create — mobile REST endpoint for starting an intake session.
 *
 * Layer: app / api / intake
 *
 * Mirrors createIntakeAction (ZSA), but authenticates via a bearer JWT
 * instead of a browser session cookie — see verify-bearer-token.ts. Built
 * for the mobile app; the existing web flow (server actions) is untouched.
 *
 * userId is injected from the verified token's `sub` claim, overriding
 * anything the client sends, so a caller cannot start an intake on behalf
 * of another user — same guarantee createIntakeAction provides today.
 *
 * org_id is likewise always taken from the token's `activeOrganizationId`
 * claim, overriding anything the client sends — same treatment as userId.
 * If the token doesn't carry that claim (see verify-bearer-token.ts), org_id
 * ends up undefined, which is valid since it's optional on the schema.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { createIntakeController } from "@/modules/server/core/intake/interface-adapters/controllers";

/**
 * Creates a new IN_PROGRESS intake session for the token's user.
 *
 * @param req - Body: `{ patient_fhir_id?, mode }`.
 * @returns 201 with the created Intake record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    const claims = await verifyBearerToken(req);
    const body = await req.json();
    const payload = {
      ...body,
      userId: claims.userId,
      org_id: claims.orgId,
    };
    const data = await createIntakeController(payload);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return mobileErrorResponse(err, "[api/intake/create]");
  }
}
