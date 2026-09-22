/**
 * createVitalsController — interface adapter for recording a Vitals entry.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 *
 * Validates the raw input against CreateVitalsValidationSchema, calls the
 * use case, and passes the result through the presenter. Throws
 * InputParseError on invalid input.
 */

import {
  CreateVitalsValidationSchema,
  TVitalsResponse,
} from "@/modules/entities/schemas/vitals";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createVitalsUseCase } from "../../application/usecases/createVitals.usecase";

/** Pass-through presenter — returns the vitals record as-is for now. */
function presenter(data: TVitalsResponse) {
  return data;
}

export type TCreateVitalsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates and executes a vitals entry creation.
 *
 * @param input - Raw (unknown) payload from the server action.
 * @returns The created vitals record.
 * @throws InputParseError on Zod validation failure.
 */
export async function createVitalsController(
  input: unknown,
): Promise<TCreateVitalsControllerOutput> {
  const parsed = await CreateVitalsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createVitalsUseCase(parsed.data);
  return presenter(data);
}
