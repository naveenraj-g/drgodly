/**
 * POST /api/consultation/save-clinical-data — mobile REST endpoint for staging
 * extracted FHIR clinical resources on a consultation.
 *
 * Layer: app / api / consultation
 *
 * Mirrors saveClinicalDataAction (ZSA). Written to by the
 * clinical-extraction-agent right after a consultation ends, and by the
 * doctor's Clinical Records workspace autosaving draft edits. Authenticates
 * via bearer JWT — see verify-bearer-token.ts.
 *
 * published_by is injected from the verified token's `sub` claim, overriding
 * anything the client sends — the client sends `mark_published` as intent
 * only, the same guarantee saveClinicalDataAction provides today, so an
 * approval can never be attributed to a doctor other than the caller.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerToken } from "@/modules/server/auth/verify-bearer-token";
import { mobileErrorResponse } from "@/modules/server/presentation/helpers/mobileApiResponse";
import { saveClinicalDataController } from "@/modules/server/core/consultation/interface-adapters/controllers";

/**
 * Saves (merges) staged clinical data for a consultation.
 *
 * @param req - Body: `{ fhir_appointment_id, service_requests?, medication_requests?,
 *   observations?, conditions?, soap_note?, mark_published? }`.
 * @returns 200 with the updated Consultation record, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    const claims = await verifyBearerToken(req);
    const body = await req.json();
    const payload = { ...body, published_by: claims.userId };
    const data = await saveClinicalDataController(payload);
    return NextResponse.json(data);
  } catch (err) {
    return mobileErrorResponse(err, "[api/consultation/save-clinical-data]");
  }
}
