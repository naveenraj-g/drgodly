/**
 * updateCarePlanController — interface adapter for patching a CarePlan.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  UpdateCarePlanValidationSchema,
  type TCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateCarePlanUseCase } from "../../application/usecases/updateCarePlan.usecase";

function presenter(data: TCarePlanResponse) {
  return data;
}

export type TUpdateCarePlanControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload (including id) and updates the CarePlan.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated CarePlan.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updateCarePlanController(
  input: unknown,
): Promise<TUpdateCarePlanControllerOutput> {
  const parsed = await UpdateCarePlanValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateCarePlanUseCase(id, dto);
  return presenter(data);
}
