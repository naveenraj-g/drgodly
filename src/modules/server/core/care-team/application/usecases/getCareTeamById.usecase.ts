/**
 * getCareTeamByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: fetch a single CareTeam by ID
 */

import { type TCareTeamResponse } from "@/modules/entities/schemas/care-team";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single CareTeam by its public ID.
 *
 * @param id - The fhir-gql public identifier.
 * @returns The matching CareTeam record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getCareTeamByIdUseCase(
  id: number,
): Promise<TCareTeamResponse> {
  const service = getInjection("ICareTeamsService");
  return service.getById(id);
}
