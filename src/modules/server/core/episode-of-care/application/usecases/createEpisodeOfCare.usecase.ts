/**
 * createEpisodeOfCareUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create EpisodeOfCare
 */

import {
  type TCreateEpisodeOfCare,
  type TEpisodeOfCareResponse,
} from "@/modules/entities/schemas/episode-of-care";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new EpisodeOfCare via injected IEpisodeOfCaresService.
 *
 * @param dto - Create payload.
 * @returns The newly created EpisodeOfCare record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createEpisodeOfCareUseCase(
  dto: TCreateEpisodeOfCare,
): Promise<TEpisodeOfCareResponse> {
  const service = getInjection("IEpisodeOfCaresService");
  return service.create(dto);
}
