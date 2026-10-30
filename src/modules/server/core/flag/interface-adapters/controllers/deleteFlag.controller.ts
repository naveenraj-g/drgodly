/**
 * deleteFlagController — interface adapter for deleting a Flag.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeleteFlagValidationSchema } from "@/modules/entities/schemas/flag";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteFlagUseCase } from "../../application/usecases/deleteFlag.usecase";

function presenter() {
  return { success: true };
}

export type TDeleteFlagControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and permanently deletes the Flag.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns Success confirmation.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteFlagController(
  input: unknown,
): Promise<TDeleteFlagControllerOutput> {
  const parsed = await DeleteFlagValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteFlagUseCase(parsed.data.id);
  return presenter();
}
