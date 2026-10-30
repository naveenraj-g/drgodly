/**
 * listCarePlansController — interface adapter for listing CarePlans.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListCarePlansValidationSchema,
  type TPaginatedCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listCarePlansUseCase } from "../../application/usecases/listCarePlans.usecase";

function presenter(data: TPaginatedCarePlanResponse) {
  return data;
}

export type TListCarePlansControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates search query and invokes listCarePlansUseCase.
 *
 * @param input - Optional raw query filters.
 * @returns Paginated CarePlans list.
 * @throws InputParseError | UnauthorizedError
 */
export async function listCarePlansController(
  input: unknown,
): Promise<TListCarePlansControllerOutput> {
  const parsed = await ListCarePlansValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listCarePlansUseCase(parsed.data);
  return presenter(data);
}
