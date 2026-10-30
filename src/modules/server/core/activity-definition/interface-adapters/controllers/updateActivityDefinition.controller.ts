/**
 * updateActivityDefinitionController — interface adapter for patching an ActivityDefinition.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  PatchActivityDefinitionValidationSchema,
  type TActivityDefinitionResponse,
} from "@/modules/entities/schemas/activity-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateActivityDefinitionUseCase } from "../../application/usecases/updateActivityDefinition.usecase";

function presenter(data: TActivityDefinitionResponse) {
  return data;
}

export type TUpdateActivityDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload (including id) and updates the ActivityDefinition.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated ActivityDefinition.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updateActivityDefinitionController(
  input: unknown,
): Promise<TUpdateActivityDefinitionControllerOutput> {
  const parsed =
    await PatchActivityDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateActivityDefinitionUseCase(id, dto);
  return presenter(data);
}
