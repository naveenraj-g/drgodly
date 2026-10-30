/**
 * deleteEpisodeOfCareUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete EpisodeOfCare
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes an EpisodeOfCare by public ID.
 *
 * @param id - Public numeric identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteEpisodeOfCareUseCase(id: number): Promise<void> {
  const service = getInjection("IEpisodeOfCaresService");
  return service.delete(id);
}
