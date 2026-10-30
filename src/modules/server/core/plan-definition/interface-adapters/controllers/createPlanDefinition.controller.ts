/**
 * createPlanDefinitionController — interface adapter for creating a PlanDefinition.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreatePlanDefinitionValidationSchema,
  type TPlanDefinitionResponse,
} from "@/modules/entities/schemas/plan-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createPlanDefinitionUseCase } from "../../application/usecases/createPlanDefinition.usecase";

function presenter(data: TPlanDefinitionResponse) {
  return data;
}

export type TCreatePlanDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates raw input and invokes createPlanDefinitionUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created PlanDefinition.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createPlanDefinitionController(
  input: unknown,
): Promise<TCreatePlanDefinitionControllerOutput> {
  const parsed = await CreatePlanDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createPlanDefinitionUseCase(parsed.data);
  return presenter(data);
}
