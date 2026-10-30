/**
 * getEpisodeOfCareByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: fetch a single EpisodeOfCare by ID
 */

import { type TEpisodeOfCareResponse } from "@/modules/entities/schemas/episode-of-care";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single EpisodeOfCare by its public ID.
 *
 * @param id - The fhir-gql public identifier.
 * @returns The matching EpisodeOfCare record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getEpisodeOfCareByIdUseCase(
  id: number,
): Promise<TEpisodeOfCareResponse> {
  const service = getInjection("IEpisodeOfCaresService");
  return service.getById(id);
}
