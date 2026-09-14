/**
 * POST /api/consultation/create — mobile REST endpoint for provisioning a consultation room.
 *
 * Layer: app / api / consultation
 *
 * Mirrors createConsultationAction (ZSA). Called immediately after a FHIR
 * appointment is booked. Authenticates via bearer JWT — see
 * verify-bearer-token.ts.
 *
 * user_id is injected from the verified token's `sub` claim, overriding
 * anything the client sends — same guarantee createConsultationAction
 * provides today (note the snake_case field name, unlike Intake/AiConsultation's
 * `userId` — it matches CreateConsultationValidationSchema exactly).
 *
 * org_id is likewise always taken from the token's `activeOrganizationId`
 * claim, overriding anything the client sends — same treatment as user_id.
 * If the token doesn't carry that claim (see verify-bearer-token.ts), org_id
 * ends up undefined, which is valid since it's optional on the schema.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { createConsultationController } from "@/modules/server/core/consultation/interface-adapters/controllers";

/**
 * Provisions a WAITING consultation room for the token's user.
 *
 * @param req - Body: `{ fhir_appointment_id }`.
 * @returns 201 with the created Consultation record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    const claims = await verifyBearerToken(req);
    const body = await req.json();
    const payload = {
      ...body,
      user_id: claims.userId,
      org_id: claims.orgId,
    };
    const data = await createConsultationController(payload);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return mobileErrorResponse(err, "[api/consultation/create]");
  }
}
