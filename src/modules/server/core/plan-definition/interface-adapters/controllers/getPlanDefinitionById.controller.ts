/**
 * getPlanDefinitionByIdController — interface adapter for fetching a PlanDefinition by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetPlanDefinitionByIdValidationSchema,
  type TPlanDefinitionResponse,
} from "@/modules/entities/schemas/plan-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getPlanDefinitionByIdUseCase } from "../../application/usecases/getPlanDefinitionById.usecase";

function presenter(data: TPlanDefinitionResponse) {
  return data;
}

export type TGetPlanDefinitionByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the ID and fetches the matching PlanDefinition.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns The PlanDefinition record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getPlanDefinitionByIdController(
  input: unknown,
): Promise<TGetPlanDefinitionByIdControllerOutput> {
  const parsed = await GetPlanDefinitionByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getPlanDefinitionByIdUseCase(parsed.data.id);
  return presenter(data);
}
