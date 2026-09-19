/**
 * saveClinicalDraftUseCase — autosaves the review page's working copy.
 *
 * Layer: server / core / consultation / application / usecases
 *
 * Called on a debounce while the doctor edits the SOAP note or any of the
 * four clinical extraction lists on the post-consultation review page, and
 * once more with `clear: true` right after a successful Confirm & Save.
 * Never touches published_at — see saveClinicalData.usecase.ts for that path.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TConsultationResponse,
  TSaveClinicalDraft,
} from "@/modules/entities/schemas/consultation";

/**
 * @param dto - fhir_appointment_id plus the draft slice(s) to write, or `clear: true`.
 * @returns The updated Consultation record.
 * @throws NotFoundError if no consultation exists for this appointment.
 */
export async function saveClinicalDraftUseCase(
  dto: TSaveClinicalDraft,
): Promise<TConsultationResponse> {
  return getInjection("IConsultationRepository").saveClinicalDraft(dto);
}
