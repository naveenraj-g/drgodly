/**
 * listEpisodeOfCaresController — interface adapter for listing EpisodeOfCares.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListEpisodeOfCaresValidationSchema,
  type TPaginatedEpisodeOfCareResponse,
} from "@/modules/entities/schemas/episode-of-care";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listEpisodeOfCaresUseCase } from "../../application/usecases/listEpisodeOfCares.usecase";

function presenter(data: TPaginatedEpisodeOfCareResponse) {
  return data;
}

export type TListEpisodeOfCaresControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates search query and invokes listEpisodeOfCaresUseCase.
 *
 * @param input - Optional raw query filters.
 * @returns Paginated EpisodeOfCares list.
 * @throws InputParseError | UnauthorizedError
 */
export async function listEpisodeOfCaresController(
  input: unknown,
): Promise<TListEpisodeOfCaresControllerOutput> {
  const parsed = await ListEpisodeOfCaresValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listEpisodeOfCaresUseCase(parsed.data);
  return presenter(data);
}
