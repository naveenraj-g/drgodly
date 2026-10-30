/**
 * createEpisodeOfCareController — interface adapter for creating an EpisodeOfCare.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreateEpisodeOfCareValidationSchema,
  type TEpisodeOfCareResponse,
} from "@/modules/entities/schemas/episode-of-care";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createEpisodeOfCareUseCase } from "../../application/usecases/createEpisodeOfCare.usecase";

function presenter(data: TEpisodeOfCareResponse) {
  return data;
}

export type TCreateEpisodeOfCareControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates raw input and invokes createEpisodeOfCareUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created EpisodeOfCare.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createEpisodeOfCareController(
  input: unknown,
): Promise<TCreateEpisodeOfCareControllerOutput> {
  const parsed = await CreateEpisodeOfCareValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createEpisodeOfCareUseCase(parsed.data);
  return presenter(data);
}
