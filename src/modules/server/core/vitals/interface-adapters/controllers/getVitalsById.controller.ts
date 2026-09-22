/**
 * getVitalsByIdController — interface adapter for fetching a single Vitals entry.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetVitalsByIdValidationSchema,
  TVitalsResponse,
} from "@/modules/entities/schemas/vitals";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getVitalsByIdUseCase } from "../../application/usecases/getVitalsById.usecase";

function presenter(data: TVitalsResponse) {
  return data;
}

export type TGetVitalsByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and fetches the matching vitals entry.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @returns The vitals record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getVitalsByIdController(
  input: unknown,
): Promise<TGetVitalsByIdControllerOutput> {
  const parsed = await GetVitalsByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getVitalsByIdUseCase(parsed.data.id);
  return presenter(data);
}
