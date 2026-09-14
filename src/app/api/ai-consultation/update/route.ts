/**
 * POST /api/ai-consultation/update — mobile REST endpoint for completing an AI consultation session.
 *
 * Layer: app / api / ai-consultation
 *
 * Mirrors updateAiConsultationAction (ZSA). Saves the conversation transcript
 * and AI report and flips status to COMPLETED. Authenticates via bearer
 * JWT — see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { updateAiConsultationController } from "@/modules/server/core/ai-consultation/interface-adapters/controllers";

/**
 * Completes an AI consultation session.
 *
 * @param req - Body: `{ id, conversation, report? }`.
 * @returns 200 with the updated AiConsultation record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const body = await req.json();
    const data = await updateAiConsultationController(body);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/ai-consultation/update]");
  }
}
