/**
 * deleteCareTeamUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete CareTeam
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes a CareTeam by its public ID.
 *
 * @param id - Public numeric identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteCareTeamUseCase(id: number): Promise<void> {
  const service = getInjection("ICareTeamsService");
  return service.delete(id);
}
