/**
 * listCareTeamsController — interface adapter for listing CareTeams.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListCareTeamsValidationSchema,
  type TPaginatedCareTeamResponse,
} from "@/modules/entities/schemas/care-team";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listCareTeamsUseCase } from "../../application/usecases/listCareTeams.usecase";

function presenter(data: TPaginatedCareTeamResponse) {
  return data;
}

export type TListCareTeamsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates search query and invokes listCareTeamsUseCase.
 *
 * @param input - Optional raw query filters.
 * @returns Paginated CareTeams list.
 * @throws InputParseError | UnauthorizedError
 */
export async function listCareTeamsController(
  input: unknown,
): Promise<TListCareTeamsControllerOutput> {
  const parsed = await ListCareTeamsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listCareTeamsUseCase(parsed.data);
  return presenter(data);
}
