/**
 * listActivityDefinitionsUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list ActivityDefinitions
 */

import {
  type TListActivityDefinitionsQuery,
  type TPaginatedActivityDefinitionResponse,
} from "@/modules/entities/schemas/activity-definition";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists ActivityDefinitions matching search query filters.
 *
 * @param query - Optional search/filter parameters.
 * @returns Paginated ActivityDefinitions response.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listActivityDefinitionsUseCase(
  query?: TListActivityDefinitionsQuery,
): Promise<TPaginatedActivityDefinitionResponse> {
  const service = getInjection("IActivityDefinitionsService");
  return service.list(query);
}
