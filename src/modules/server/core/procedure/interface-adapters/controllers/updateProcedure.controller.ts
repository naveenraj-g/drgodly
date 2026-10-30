/**
 * updateProcedureController — interface adapter for partially updating a Procedure.
 *
 * Layer: interface-adapters / controllers
 * Operation: update (PATCH — scalar/reference fields + REPLACE-semantics child arrays)
 *
 * Splits id from the dto before passing to the use case, matching the service
 * interface signature update(id, dto).
 */

import {
  UpdateProcedureDtoSchema,
  UpdateProcedureValidationSchema,
  TProcedureResponse,
} from "@/modules/entities/schemas/procedure";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateProcedureUseCase } from "../../application/usecases/updateProcedure.usecase";

function presenter(data: TProcedureResponse) {
  return data;
}

export type TUpdateProcedureControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload and applies the update.
 *
 * @param input - Raw payload: `{ id: number, ...patchable fields }`.
 * @returns The updated Procedure record.
 * @throws InputParseError | ValidationError | NotFoundError
 */
export async function updateProcedureController(
  input: unknown,
): Promise<TUpdateProcedureControllerOutput> {
  const parsed = await UpdateProcedureValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const { id, ...dto } = parsed.data;
  // Validate the dto portion independently so the error message is precise.
  const dtoParsed = await UpdateProcedureDtoSchema.safeParseAsync(dto);
  if (!dtoParsed.success) throw new InputParseError(dtoParsed.error);

  const data = await updateProcedureUseCase(id, dtoParsed.data);
  return presenter(data);
}
