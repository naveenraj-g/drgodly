/**
 * getFlagByIdController — interface adapter for fetching a Flag by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetByIdFlagValidationSchema,
  type TFlagResponse,
} from "@/modules/entities/schemas/flag";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getFlagByIdUseCase } from "../../application/usecases/getFlagById.usecase";

function presenter(data: TFlagResponse) {
  return data;
}

export type TGetFlagByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the ID and fetches the matching Flag.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns The Flag record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getFlagByIdController(
  input: unknown,
): Promise<TGetFlagByIdControllerOutput> {
  const parsed = await GetByIdFlagValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getFlagByIdUseCase(parsed.data.id);
  return presenter(data);
}
