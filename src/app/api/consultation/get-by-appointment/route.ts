/**
 * GET /api/consultation/get-by-appointment?fhir_appointment_id={id} — mobile
 * REST endpoint for fetching a consultation by its FHIR appointment.
 *
 * Layer: app / api / consultation
 *
 * Mirrors getConsultationByFhirAppointmentIdAction (ZSA). Authenticates via
 * bearer JWT — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { getConsultationByFhirAppointmentIdController } from "@/modules/server/core/consultation/interface-adapters/controllers";

/**
 * Fetches the consultation linked to a FHIR appointment, or null if none was provisioned.
 *
 * @param req - Query param: `fhir_appointment_id`.
 * @returns 200 with the Consultation record or null, or an error response.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const param = req.nextUrl.searchParams.get("fhir_appointment_id");
    const fhir_appointment_id = param ? Number(param) : NaN;
    const data = await getConsultationByFhirAppointmentIdController({ fhir_appointment_id });
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/consultation/get-by-appointment]");
  }
}
