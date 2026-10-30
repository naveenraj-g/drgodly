/**
 * listCareTeamsUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list CareTeams
 */

import {
  type TListCareTeamsQuery,
  type TPaginatedCareTeamResponse,
} from "@/modules/entities/schemas/care-team";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists CareTeams matching query filters.
 *
 * @param query - Optional search/filter parameters.
 * @returns Paginated CareTeams response.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listCareTeamsUseCase(
  query?: TListCareTeamsQuery,
): Promise<TPaginatedCareTeamResponse> {
  const service = getInjection("ICareTeamsService");
  return service.list(query);
}
