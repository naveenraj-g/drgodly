/**
 * listPlanDefinitionsUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list PlanDefinitions
 */

import {
  type TListPlanDefinitionsQuery,
  type TPaginatedPlanDefinitionResponse,
} from "@/modules/entities/schemas/plan-definition";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists PlanDefinitions matching query filters.
 *
 * @param query - Optional search/filter parameters.
 * @returns Paginated PlanDefinitions response.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listPlanDefinitionsUseCase(
  query?: TListPlanDefinitionsQuery,
): Promise<TPaginatedPlanDefinitionResponse> {
  const service = getInjection("IPlanDefinitionsService");
  return service.list(query);
}
