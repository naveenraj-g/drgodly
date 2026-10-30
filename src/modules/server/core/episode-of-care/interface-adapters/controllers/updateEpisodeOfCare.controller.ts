/**
 * updateEpisodeOfCareController — interface adapter for patching an EpisodeOfCare.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  UpdateEpisodeOfCareValidationSchema,
  type TEpisodeOfCareResponse,
} from "@/modules/entities/schemas/episode-of-care";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateEpisodeOfCareUseCase } from "../../application/usecases/updateEpisodeOfCare.usecase";

function presenter(data: TEpisodeOfCareResponse) {
  return data;
}

export type TUpdateEpisodeOfCareControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload (including id) and updates the EpisodeOfCare.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated EpisodeOfCare.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updateEpisodeOfCareController(
  input: unknown,
): Promise<TUpdateEpisodeOfCareControllerOutput> {
  const parsed = await UpdateEpisodeOfCareValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateEpisodeOfCareUseCase(id, dto);
  return presenter(data);
}
