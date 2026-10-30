/**
 * createCareTeamController — interface adapter for creating a CareTeam.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreateCareTeamValidationSchema,
  type TCareTeamResponse,
} from "@/modules/entities/schemas/care-team";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createCareTeamUseCase } from "../../application/usecases/createCareTeam.usecase";

function presenter(data: TCareTeamResponse) {
  return data;
}

export type TCreateCareTeamControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates raw input and invokes createCareTeamUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created CareTeam.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createCareTeamController(
  input: unknown,
): Promise<TCreateCareTeamControllerOutput> {
  const parsed = await CreateCareTeamValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createCareTeamUseCase(parsed.data);
  return presenter(data);
}
