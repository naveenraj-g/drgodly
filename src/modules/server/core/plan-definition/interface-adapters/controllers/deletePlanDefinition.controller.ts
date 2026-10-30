/**
 * deletePlanDefinitionController — interface adapter for deleting a PlanDefinition.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeletePlanDefinitionValidationSchema } from "@/modules/entities/schemas/plan-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deletePlanDefinitionUseCase } from "../../application/usecases/deletePlanDefinition.usecase";

function presenter() {
  return { success: true };
}

export type TDeletePlanDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and permanently deletes the PlanDefinition.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns Success confirmation.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deletePlanDefinitionController(
  input: unknown,
): Promise<TDeletePlanDefinitionControllerOutput> {
  const parsed = await DeletePlanDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePlanDefinitionUseCase(parsed.data.id);
  return presenter();
}
