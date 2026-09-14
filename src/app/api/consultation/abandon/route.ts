/**
 * POST /api/consultation/abandon — mobile REST endpoint for abandoning a consultation.
 *
 * Layer: app / api / consultation
 *
 * Mirrors abandonConsultationAction (ZSA). Called when a participant leaves
 * without completing the session. Authenticates via bearer JWT — see
 * verify-bearer-token.ts.
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
    await verifyBearerToken(req);
    const body = await req.json();
    const data = await abandonConsultationController(body);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/consultation/abandon]");
  }
}
