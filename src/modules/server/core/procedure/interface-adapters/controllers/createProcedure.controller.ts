/**
 * createProcedureController — interface adapter for creating a Procedure.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 *
 * Validates the raw input against CreateProcedureValidationSchema, calls the
 * use case, and passes the result through the presenter. Throws
 * InputParseError on invalid input.
 */

import {
  CreateProcedureValidationSchema,
  TProcedureResponse,
} from "@/modules/entities/schemas/procedure";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createProcedureUseCase } from "../../application/usecases/createProcedure.usecase";

/** Pass-through presenter — returns the Procedure record as-is for now. */
function presenter(data: TProcedureResponse) {
  return data;
}

export type TCreateProcedureControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates and executes a Procedure creation.
 *
 * @param input - Raw (unknown) payload from the server action.
 * @returns The created Procedure record.
 * @throws InputParseError on Zod validation failure.
 */
export async function createProcedureController(
  input: unknown,
): Promise<TCreateProcedureControllerOutput> {
  const parsed = await CreateProcedureValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createProcedureUseCase(parsed.data);
  return presenter(data);
}
