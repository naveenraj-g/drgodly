/**
 * updatePlanDefinitionUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update PlanDefinition
 */

import {
  type TPatchPlanDefinitionDto,
  type TPlanDefinitionResponse,
} from "@/modules/entities/schemas/plan-definition";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates an existing PlanDefinition.
 *
 * @param id  - Public numeric identifier.
 * @param dto - Patchable fields.
 * @returns The updated PlanDefinition record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updatePlanDefinitionUseCase(
  id: number,
  dto: TPatchPlanDefinitionDto,
): Promise<TPlanDefinitionResponse> {
  const service = getInjection("IPlanDefinitionsService");
  return service.update(id, dto);
}
