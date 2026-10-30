/**
 * getByIdProcedureController — interface adapter for fetching a single Procedure.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetByIdProcedureValidationSchema,
  TProcedureResponse,
} from "@/modules/entities/schemas/procedure";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getByIdProcedureUseCase } from "../../application/usecases/getByIdProcedure.usecase";

function presenter(data: TProcedureResponse) {
  return data;
}

export type TGetByIdProcedureControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and fetches the matching Procedure.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @returns The Procedure record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getByIdProcedureController(
  input: unknown,
): Promise<TGetByIdProcedureControllerOutput> {
  const parsed = await GetByIdProcedureValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getByIdProcedureUseCase(parsed.data.id);
  return presenter(data);
}
