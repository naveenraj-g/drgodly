/**
 * updateEpisodeOfCareUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update EpisodeOfCare
 */

import {
  type TUpdateEpisodeOfCareDto,
  type TEpisodeOfCareResponse,
} from "@/modules/entities/schemas/episode-of-care";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates an existing EpisodeOfCare.
 *
 * @param id  - Public numeric identifier.
 * @param dto - Patchable fields.
 * @returns The updated EpisodeOfCare record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateEpisodeOfCareUseCase(
  id: number,
  dto: TUpdateEpisodeOfCareDto,
): Promise<TEpisodeOfCareResponse> {
  const service = getInjection("IEpisodeOfCaresService");
  return service.update(id, dto);
}
