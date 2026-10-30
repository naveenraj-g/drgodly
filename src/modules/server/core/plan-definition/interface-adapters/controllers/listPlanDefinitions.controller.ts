/**
 * listPlanDefinitionsController — interface adapter for listing PlanDefinitions.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListPlanDefinitionsValidationSchema,
  type TPaginatedPlanDefinitionResponse,
} from "@/modules/entities/schemas/plan-definition";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPlanDefinitionsUseCase } from "../../application/usecases/listPlanDefinitions.usecase";

function presenter(data: TPaginatedPlanDefinitionResponse) {
  return data;
}

export type TListPlanDefinitionsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates search query and invokes listPlanDefinitionsUseCase.
 *
 * @param input - Optional raw query filters.
 * @returns Paginated PlanDefinitions list.
 * @throws InputParseError | UnauthorizedError
 */
export async function listPlanDefinitionsController(
  input: unknown,
): Promise<TListPlanDefinitionsControllerOutput> {
  const parsed = await ListPlanDefinitionsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPlanDefinitionsUseCase(parsed.data);
  return presenter(data);
}
