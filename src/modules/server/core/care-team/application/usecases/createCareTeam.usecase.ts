/**
 * createCareTeamUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create CareTeam
 */

import {
  type TCreateCareTeam,
  type TCareTeamResponse,
} from "@/modules/entities/schemas/care-team";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new CareTeam via injected ICareTeamsService.
 *
 * @param dto - Create payload.
 * @returns The newly created CareTeam record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createCareTeamUseCase(
  dto: TCreateCareTeam,
): Promise<TCareTeamResponse> {
  const service = getInjection("ICareTeamsService");
  return service.create(dto);
}
