/**
 * updateVitalsController — interface adapter for partially updating a Vitals entry.
 *
 * Layer: interface-adapters / controllers
 * Operation: update (PATCH — metric fields only, see PatchVitalsDtoSchema)
 *
 * Splits id from the dto before passing to the use case, matching the service
 * interface signature update(id, dto).
 */

import {
  PatchVitalsDtoSchema,
  PatchVitalsValidationSchema,
  TVitalsResponse,
} from "@/modules/entities/schemas/vitals";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateVitalsUseCase } from "../../application/usecases/updateVitals.usecase";

function presenter(data: TVitalsResponse) {
  return data;
}

export type TUpdateVitalsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload and applies the update.
 *
 * @param input - Raw payload: `{ id: number, ...patchable metric fields }`.
 * @returns The updated vitals record.
 * @throws InputParseError | ValidationError | NotFoundError
 */
export async function updateVitalsController(
  input: unknown,
): Promise<TUpdateVitalsControllerOutput> {
  const parsed = await PatchVitalsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const { id, ...dto } = parsed.data;
  // Validate the dto portion independently so the error message is precise.
  const dtoParsed = await PatchVitalsDtoSchema.safeParseAsync(dto);
  if (!dtoParsed.success) throw new InputParseError(dtoParsed.error);

  const data = await updateVitalsUseCase(id, dtoParsed.data);
  return presenter(data);
}
