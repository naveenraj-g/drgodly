/**
 * deleteCarePlanController — interface adapter for deleting a CarePlan.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeleteCarePlanValidationSchema } from "@/modules/entities/schemas/care-plan";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteCarePlanUseCase } from "../../application/usecases/deleteCarePlan.usecase";

function presenter() {
  return { success: true };
}

export type TDeleteCarePlanControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and permanently deletes the CarePlan.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns Success confirmation.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteCarePlanController(
  input: unknown,
): Promise<TDeleteCarePlanControllerOutput> {
  const parsed = await DeleteCarePlanValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteCarePlanUseCase(parsed.data.id);
  return presenter();
}
