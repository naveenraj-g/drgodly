/**
 * getCareTeamByIdController — interface adapter for fetching a CareTeam by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetByIdCareTeamValidationSchema,
  type TCareTeamResponse,
} from "@/modules/entities/schemas/care-team";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getCareTeamByIdUseCase } from "../../application/usecases/getCareTeamById.usecase";

function presenter(data: TCareTeamResponse) {
  return data;
}

export type TGetCareTeamByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the ID and fetches the matching CareTeam.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns The CareTeam record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getCareTeamByIdController(
  input: unknown,
): Promise<TGetCareTeamByIdControllerOutput> {
  const parsed = await GetByIdCareTeamValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getCareTeamByIdUseCase(parsed.data.id);
  return presenter(data);
}
