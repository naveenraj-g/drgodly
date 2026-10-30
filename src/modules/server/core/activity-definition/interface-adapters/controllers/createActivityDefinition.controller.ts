/**
 * createActivityDefinitionController — interface adapter for creating an ActivityDefinition.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreateActivityDefinitionValidationSchema,
  type TActivityDefinitionResponse,
} from "@/modules/entities/schemas/activity-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createActivityDefinitionUseCase } from "../../application/usecases/createActivityDefinition.usecase";

function presenter(data: TActivityDefinitionResponse) {
  return data;
}

export type TCreateActivityDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates raw input and invokes createActivityDefinitionUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created ActivityDefinition.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createActivityDefinitionController(
  input: unknown,
): Promise<TCreateActivityDefinitionControllerOutput> {
  const parsed =
    await CreateActivityDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createActivityDefinitionUseCase(parsed.data);
  return presenter(data);
}
