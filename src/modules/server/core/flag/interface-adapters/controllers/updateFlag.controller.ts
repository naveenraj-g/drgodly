/**
 * updateFlagController — interface adapter for patching a Flag.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  UpdateFlagValidationSchema,
  type TFlagResponse,
} from "@/modules/entities/schemas/flag";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateFlagUseCase } from "../../application/usecases/updateFlag.usecase";

function presenter(data: TFlagResponse) {
  return data;
}

export type TUpdateFlagControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload (including id) and updates the Flag.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated Flag.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updateFlagController(
  input: unknown,
): Promise<TUpdateFlagControllerOutput> {
  const parsed = await UpdateFlagValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateFlagUseCase(id, dto);
  return presenter(data);
}
