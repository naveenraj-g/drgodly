/**
 * listEpisodeOfCaresUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list EpisodeOfCares
 */

import {
  type TListEpisodeOfCaresQuery,
  type TPaginatedEpisodeOfCareResponse,
} from "@/modules/entities/schemas/episode-of-care";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists EpisodeOfCares matching query filters.
 *
 * @param query - Optional search/filter parameters.
 * @returns Paginated EpisodeOfCares response.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listEpisodeOfCaresUseCase(
  query?: TListEpisodeOfCaresQuery,
): Promise<TPaginatedEpisodeOfCareResponse> {
  const service = getInjection("IEpisodeOfCaresService");
  return service.list(query);
}
