/**
 * POST /api/ai-consultation/create — mobile REST endpoint for starting an AI consultation session.
 *
 * Layer: app / api / ai-consultation
 *
 * Mirrors createAiConsultationAction (ZSA). Authenticates via bearer JWT —
 * see verify-bearer-token.ts.
 *
 * userId is injected from the verified token's `sub` claim, overriding
 * anything the client sends — same guarantee createAiConsultationAction
 * provides today.
 *
 * org_id is likewise always taken from the token's `activeOrganizationId`
 * claim, overriding anything the client sends — same treatment as userId.
 * If the token doesn't carry that claim (see verify-bearer-token.ts), org_id
 * ends up undefined, which is valid since it's optional on the schema.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { createAiConsultationController } from "@/modules/server/core/ai-consultation/interface-adapters/controllers";

/**
 * Creates a new IN_PROGRESS AI consultation session for the token's user.
 *
 * @param req - Body: `{ patient_fhir_id?, mode }`.
 * @returns 201 with the created AiConsultation record, or an error response.
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
    const data = await createAiConsultationController(payload);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return mobileErrorResponse(err, "[api/ai-consultation/create]");
  }
}
