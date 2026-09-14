/**
 * GET /api/ai-consultation/get-by-id?id={id} — mobile REST endpoint for
 * fetching one AI consultation.
 *
 * Layer: app / api / ai-consultation
 *
 * Mirrors getAiConsultationByIdAction (ZSA). Authenticates via bearer JWT —
 * see verify-bearer-token.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { getAiConsultationByIdController } from "@/modules/server/core/ai-consultation/interface-adapters/controllers";

/**
 * Fetches a single AI consultation by its local integer ID.
 *
 * @param req - Query param: `id`.
 * @returns 200 with the AiConsultation record, or an error response.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyBearerToken(req);
    const idParam = req.nextUrl.searchParams.get("id");
    const id = idParam ? Number(idParam) : NaN;
    const data = await getAiConsultationByIdController({ id });
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/ai-consultation/get-by-id]");
  }
}
