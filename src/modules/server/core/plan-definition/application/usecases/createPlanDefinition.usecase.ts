/**
 * createPlanDefinitionUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create PlanDefinition
 */

import {
  type TCreatePlanDefinition,
  type TPlanDefinitionResponse,
} from "@/modules/entities/schemas/plan-definition";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new PlanDefinition via the injected IPlanDefinitionsService.
 *
 * @param dto - Create payload.
 * @returns The newly created PlanDefinition record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createPlanDefinitionUseCase(
  dto: TCreatePlanDefinition,
): Promise<TPlanDefinitionResponse> {
  const service = getInjection("IPlanDefinitionsService");
  return service.create(dto);
}
