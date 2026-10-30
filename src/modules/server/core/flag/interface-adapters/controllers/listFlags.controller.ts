/**
 * listFlagsController — interface adapter for listing Flags.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListFlagsValidationSchema,
  type TPaginatedFlagResponse,
} from "@/modules/entities/schemas/flag";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listFlagsUseCase } from "../../application/usecases/listFlags.usecase";

function presenter(data: TPaginatedFlagResponse) {
  return data;
}

export type TListFlagsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates search query and invokes listFlagsUseCase.
 *
 * @param input - Optional raw query filters.
 * @returns Paginated Flags list.
 * @throws InputParseError | UnauthorizedError
 */
export async function listFlagsController(
  input: unknown,
): Promise<TListFlagsControllerOutput> {
  const parsed = await ListFlagsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listFlagsUseCase(parsed.data);
  return presenter(data);
}
