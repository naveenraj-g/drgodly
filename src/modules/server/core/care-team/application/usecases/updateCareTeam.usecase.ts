/**
 * updateCareTeamUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update CareTeam
 */

import {
  type TUpdateCareTeamDto,
  type TCareTeamResponse,
} from "@/modules/entities/schemas/care-team";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates an existing CareTeam.
 *
 * @param id  - Public numeric identifier.
 * @param dto - Patchable fields.
 * @returns The updated CareTeam record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateCareTeamUseCase(
  id: number,
  dto: TUpdateCareTeamDto,
): Promise<TCareTeamResponse> {
  const service = getInjection("ICareTeamsService");
  return service.update(id, dto);
}
