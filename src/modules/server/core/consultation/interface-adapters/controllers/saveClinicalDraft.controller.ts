/**
 * saveClinicalDraftController — autosaves the review page's working copy.
 *
 * Layer: server / core / consultation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  SaveClinicalDraftValidationSchema,
  type TConsultationResponse,
} from "@/modules/entities/schemas/consultation";
import { saveClinicalDraftUseCase } from "../../application/usecases/saveClinicalDraft.usecase";

function presenter(data: TConsultationResponse) {
  return data;
}

export type TSaveClinicalDraftControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw payload ({ fhir_appointment_id, soap_note?, conditions?, ..., clear? }).
 * @returns The updated Consultation record.
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if no consultation exists for this appointment.
 */
export async function saveClinicalDraftController(
  input: unknown,
): Promise<TSaveClinicalDraftControllerOutput> {
  const parsed = await SaveClinicalDraftValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await saveClinicalDraftUseCase(parsed.data);
  return presenter(data);
}
