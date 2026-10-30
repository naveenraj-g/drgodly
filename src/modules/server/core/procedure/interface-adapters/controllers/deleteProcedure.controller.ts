/**
 * deleteProcedureController — interface adapter for deleting a Procedure.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete (irreversible — cascades to all child records)
 */

import { DeleteProcedureValidationSchema } from "@/modules/entities/schemas/procedure";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteProcedureUseCase } from "../../application/usecases/deleteProcedure.usecase";

export type TDeleteProcedureControllerOutput = void;

/**
 * Validates the id and deletes the Procedure.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteProcedureController(
  input: unknown,
): Promise<TDeleteProcedureControllerOutput> {
  const parsed = await DeleteProcedureValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteProcedureUseCase(parsed.data.id);
}
