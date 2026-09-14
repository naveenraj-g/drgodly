/**
 * POST /api/intake/link — mobile REST endpoint for linking an intake to a booked appointment.
 *
 * Layer: app / api / intake
 *
 * Mirrors linkIntakeToAppointmentAction (ZSA). Call immediately after a
 * successful appointment booking when an intake_id was present in the
 * booking flow. Authenticates via bearer JWT — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { linkIntakeToAppointmentController } from "@/modules/server/core/intake/interface-adapters/controllers";

/**
 * Links a completed intake to a FHIR appointment.
 *
 * @param req - Body: `{ id, fhir_appointment_id }`.
 * @returns 200 with the updated Intake record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const body = await req.json();
    const data = await linkIntakeToAppointmentController(body);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/intake/link]");
  }
}
