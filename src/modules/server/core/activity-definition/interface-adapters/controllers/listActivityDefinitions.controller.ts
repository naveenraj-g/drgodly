/**
 * listActivityDefinitionsController — interface adapter for listing ActivityDefinitions.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListActivityDefinitionsValidationSchema,
  type TPaginatedActivityDefinitionResponse,
} from "@/modules/entities/schemas/activity-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listActivityDefinitionsUseCase } from "../../application/usecases/listActivityDefinitions.usecase";

function presenter(data: TPaginatedActivityDefinitionResponse) {
  return data;
}

export type TListActivityDefinitionsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates search query and invokes listActivityDefinitionsUseCase.
 *
 * @param input - Optional raw query filters.
 * @returns Paginated ActivityDefinitions list.
 * @throws InputParseError | UnauthorizedError
 */
export async function listActivityDefinitionsController(
  input: unknown,
): Promise<TListActivityDefinitionsControllerOutput> {
  const parsed =
    await ListActivityDefinitionsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listActivityDefinitionsUseCase(parsed.data);
  return presenter(data);
}
