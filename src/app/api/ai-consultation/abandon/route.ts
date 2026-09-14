/**
 * POST /api/ai-consultation/abandon — mobile REST endpoint for abandoning an
 * in-progress AI consultation.
 *
 * Layer: app / api / ai-consultation
 *
 * Mirrors abandonAiConsultationAction (ZSA). Called when the patient
 * navigates away without completing. Authenticates via bearer JWT — see
 * verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { abandonAiConsultationController } from "@/modules/server/core/ai-consultation/interface-adapters/controllers";

/**
 * Marks an in-progress AI consultation as ABANDONED.
 *
 * @param req - Body: `{ id }`.
 * @returns 200 with the updated AiConsultation record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const body = await req.json();
    const data = await abandonAiConsultationController(body);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/ai-consultation/abandon]");
  }
}
