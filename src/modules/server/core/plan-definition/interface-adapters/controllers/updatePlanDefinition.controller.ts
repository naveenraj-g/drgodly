/**
 * updatePlanDefinitionController — interface adapter for patching a PlanDefinition.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  PatchPlanDefinitionValidationSchema,
  type TPlanDefinitionResponse,
} from "@/modules/entities/schemas/plan-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updatePlanDefinitionUseCase } from "../../application/usecases/updatePlanDefinition.usecase";

function presenter(data: TPlanDefinitionResponse) {
  return data;
}

export type TUpdatePlanDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload (including id) and updates the PlanDefinition.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated PlanDefinition.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updatePlanDefinitionController(
  input: unknown,
): Promise<TUpdatePlanDefinitionControllerOutput> {
  const parsed = await PatchPlanDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updatePlanDefinitionUseCase(id, dto);
  return presenter(data);
}
