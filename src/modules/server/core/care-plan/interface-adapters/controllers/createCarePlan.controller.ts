/**
 * createCarePlanController — interface adapter for creating a CarePlan.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreateCarePlanValidationSchema,
  type TCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createCarePlanUseCase } from "../../application/usecases/createCarePlan.usecase";

function presenter(data: TCarePlanResponse) {
  return data;
}

export type TCreateCarePlanControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates raw input and invokes createCarePlanUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created CarePlan.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createCarePlanController(
  input: unknown,
): Promise<TCreateCarePlanControllerOutput> {
  const parsed = await CreateCarePlanValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createCarePlanUseCase(parsed.data);
  return presenter(data);
}
