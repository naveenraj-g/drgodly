/**
 * getActivityDefinitionByIdController — interface adapter for fetching an ActivityDefinition by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetByIdActivityDefinitionValidationSchema,
  type TActivityDefinitionResponse,
} from "@/modules/entities/schemas/activity-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getActivityDefinitionByIdUseCase } from "../../application/usecases/getActivityDefinitionById.usecase";

function presenter(data: TActivityDefinitionResponse) {
  return data;
}

export type TGetByIdActivityDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the ID and fetches the matching ActivityDefinition.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns The ActivityDefinition record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getActivityDefinitionByIdController(
  input: unknown,
): Promise<TGetByIdActivityDefinitionControllerOutput> {
  const parsed =
    await GetByIdActivityDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getActivityDefinitionByIdUseCase(parsed.data.id);
  return presenter(data);
}
