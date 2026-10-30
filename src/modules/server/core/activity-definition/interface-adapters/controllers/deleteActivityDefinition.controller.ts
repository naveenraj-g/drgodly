/**
 * deleteActivityDefinitionController — interface adapter for deleting an ActivityDefinition.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeleteActivityDefinitionValidationSchema } from "@/modules/entities/schemas/activity-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteActivityDefinitionUseCase } from "../../application/usecases/deleteActivityDefinition.usecase";

function presenter() {
  return { success: true };
}

export type TDeleteActivityDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and permanently deletes the ActivityDefinition.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns Success confirmation.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteActivityDefinitionController(
  input: unknown,
): Promise<TDeleteActivityDefinitionControllerOutput> {
  const parsed =
    await DeleteActivityDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteActivityDefinitionUseCase(parsed.data.id);
  return presenter();
}
