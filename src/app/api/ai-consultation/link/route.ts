/**
 * POST /api/ai-consultation/link — mobile REST endpoint for linking an AI
 * consultation to a booked follow-up appointment.
 *
 * Layer: app / api / ai-consultation
 *
 * Mirrors linkAiConsultationToAppointmentAction (ZSA). Call immediately after
 * a successful appointment booking when a consultation_id was present in the
 * booking flow. Authenticates via bearer JWT — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { linkAiConsultationToAppointmentController } from "@/modules/server/core/ai-consultation/interface-adapters/controllers";

/**
 * Links a completed AI consultation to a FHIR appointment.
 *
 * @param req - Body: `{ id, fhir_appointment_id }`.
 * @returns 200 with the updated AiConsultation record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const body = await req.json();
    const data = await linkAiConsultationToAppointmentController(body);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/ai-consultation/link]");
  }
}
