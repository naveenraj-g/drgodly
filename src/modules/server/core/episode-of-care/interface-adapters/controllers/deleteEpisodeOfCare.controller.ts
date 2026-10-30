/**
 * deleteEpisodeOfCareController — interface adapter for deleting an EpisodeOfCare.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeleteEpisodeOfCareValidationSchema } from "@/modules/entities/schemas/episode-of-care";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteEpisodeOfCareUseCase } from "../../application/usecases/deleteEpisodeOfCare.usecase";

function presenter() {
  return { success: true };
}

export type TDeleteEpisodeOfCareControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and permanently deletes the EpisodeOfCare.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns Success confirmation.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteEpisodeOfCareController(
  input: unknown,
): Promise<TDeleteEpisodeOfCareControllerOutput> {
  const parsed = await DeleteEpisodeOfCareValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteEpisodeOfCareUseCase(parsed.data.id);
  return presenter();
}
