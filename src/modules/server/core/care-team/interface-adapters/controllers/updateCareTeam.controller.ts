/**
 * updateCareTeamController — interface adapter for patching a CareTeam.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  UpdateCareTeamValidationSchema,
  type TCareTeamResponse,
} from "@/modules/entities/schemas/care-team";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateCareTeamUseCase } from "../../application/usecases/updateCareTeam.usecase";

function presenter(data: TCareTeamResponse) {
  return data;
}

export type TUpdateCareTeamControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload (including id) and updates the CareTeam.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated CareTeam.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updateCareTeamController(
  input: unknown,
): Promise<TUpdateCareTeamControllerOutput> {
  const parsed = await UpdateCareTeamValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateCareTeamUseCase(id, dto);
  return presenter(data);
}
