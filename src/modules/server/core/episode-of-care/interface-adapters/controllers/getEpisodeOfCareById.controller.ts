/**
 * getEpisodeOfCareByIdController — interface adapter for fetching an EpisodeOfCare by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetByIdEpisodeOfCareValidationSchema,
  type TEpisodeOfCareResponse,
} from "@/modules/entities/schemas/episode-of-care";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getEpisodeOfCareByIdUseCase } from "../../application/usecases/getEpisodeOfCareById.usecase";

function presenter(data: TEpisodeOfCareResponse) {
  return data;
}

export type TGetEpisodeOfCareByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the ID and fetches the matching EpisodeOfCare.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns The EpisodeOfCare record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getEpisodeOfCareByIdController(
  input: unknown,
): Promise<TGetEpisodeOfCareByIdControllerOutput> {
  const parsed = await GetByIdEpisodeOfCareValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getEpisodeOfCareByIdUseCase(parsed.data.id);
  return presenter(data);
}
