/**
 * GET /api/intake/get-by-appointment?fhir_appointment_id={id} — mobile REST
 * endpoint for the doctor-side intake lookup by FHIR appointment.
 *
 * Layer: app / api / intake
 *
 * Mirrors getIntakeByFhirAppointmentIdAction (ZSA). Authenticates via bearer
 * JWT — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { getIntakeByFhirAppointmentIdController } from "@/modules/server/core/intake/interface-adapters/controllers";

/**
 * Retrieves the intake linked to a FHIR appointment, or null if none exists.
 *
 * @param req - Query param: `fhir_appointment_id`.
 * @returns 200 with the Intake record or null, or an error response.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const param = req.nextUrl.searchParams.get("fhir_appointment_id");
    const fhir_appointment_id = param ? Number(param) : NaN;
    const data = await getIntakeByFhirAppointmentIdController({ fhir_appointment_id });
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/intake/get-by-appointment]");
  }
}
