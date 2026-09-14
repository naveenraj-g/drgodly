/**
 * POST /api/consultation/complete — mobile REST endpoint for completing a consultation.
 *
 * Layer: app / api / consultation
 *
 * Mirrors completeConsultationAction (ZSA). Writes the transcript, SOAP note,
 * and merged full report, then flips status to COMPLETED. Authenticates via
 * bearer JWT — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { completeConsultationController } from "@/modules/server/core/consultation/interface-adapters/controllers";

/**
 * Completes a consultation.
 *
 * @param req - Body: `{ fhir_appointment_id, virtual_conversation?, soap_note?, full_report? }`.
 * @returns 200 with the updated Consultation record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const body = await req.json();
    const data = await completeConsultationController(body);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/consultation/complete]");
  }
}
