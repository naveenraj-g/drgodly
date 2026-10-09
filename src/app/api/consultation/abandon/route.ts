/**
 * POST /api/consultation/abandon — mobile REST endpoint for abandoning a consultation.
 *
 * Layer: app / api / consultation
 *
 * Mirrors abandonConsultationAction (ZSA). Called when a participant leaves
 * without completing the session. Authenticates via bearer JWT — see
 * verify-bearer-token.ts.
 *
 * org_id is always taken from the token, never the client — the repository
 * requires it to match the target consultation's own org_id before writing,
 * so a caller in one org can't abandon another org's consultation by
 * guessing a fhir_appointment_id. Same guarantee abandonConsultationAction
 * provides today.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { abandonConsultationController } from "@/modules/server/core/consultation/interface-adapters/controllers";

/**
 * Marks a consultation ABANDONED.
 *
 * @param req - Body: `{ fhir_appointment_id }`.
 * @returns 200 with the updated Consultation record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    const claims = await verifyBearerToken(req);
    const body = await req.json();
    const payload = { ...body, org_id: claims.orgId };
    const data = await abandonConsultationController(payload);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/consultation/abandon]");
  }
}
