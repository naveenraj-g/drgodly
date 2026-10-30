/**
 * createFlagController — interface adapter for creating a Flag.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreateFlagValidationSchema,
  type TFlagResponse,
} from "@/modules/entities/schemas/flag";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createFlagUseCase } from "../../application/usecases/createFlag.usecase";

function presenter(data: TFlagResponse) {
  return data;
}

export type TCreateFlagControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates raw input and invokes createFlagUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created Flag.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createFlagController(
  input: unknown,
): Promise<TCreateFlagControllerOutput> {
  const parsed = await CreateFlagValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createFlagUseCase(parsed.data);
  return presenter(data);
}
