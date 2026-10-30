/**
 * deleteCareTeamController — interface adapter for deleting a CareTeam.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeleteCareTeamValidationSchema } from "@/modules/entities/schemas/care-team";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteCareTeamUseCase } from "../../application/usecases/deleteCareTeam.usecase";

function presenter() {
  return { success: true };
}

export type TDeleteCareTeamControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and permanently deletes the CareTeam.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns Success confirmation.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteCareTeamController(
  input: unknown,
): Promise<TDeleteCareTeamControllerOutput> {
  const parsed = await DeleteCareTeamValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteCareTeamUseCase(parsed.data.id);
  return presenter();
}
