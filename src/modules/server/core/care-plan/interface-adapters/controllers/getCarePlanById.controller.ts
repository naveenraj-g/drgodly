/**
 * getCarePlanByIdController — interface adapter for fetching a CarePlan by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetByIdCarePlanValidationSchema,
  type TCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getCarePlanByIdUseCase } from "../../application/usecases/getCarePlanById.usecase";

function presenter(data: TCarePlanResponse) {
  return data;
}

export type TGetCarePlanByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the ID and fetches the matching CarePlan.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns The CarePlan record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getCarePlanByIdController(
  input: unknown,
): Promise<TGetCarePlanByIdControllerOutput> {
  const parsed = await GetByIdCarePlanValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getCarePlanByIdUseCase(parsed.data.id);
  return presenter(data);
}
