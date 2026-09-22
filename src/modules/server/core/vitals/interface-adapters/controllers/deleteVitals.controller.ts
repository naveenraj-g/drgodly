/**
 * deleteVitalsController — interface adapter for deleting a Vitals entry.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete (irreversible — 204 No Content from fhir-gql)
 */

import { DeleteVitalsValidationSchema } from "@/modules/entities/schemas/vitals";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteVitalsUseCase } from "../../application/usecases/deleteVitals.usecase";

export type TDeleteVitalsControllerOutput = void;

/**
 * Validates the id and deletes the vitals entry.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteVitalsController(
  input: unknown,
): Promise<TDeleteVitalsControllerOutput> {
  const parsed = await DeleteVitalsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteVitalsUseCase(parsed.data.id);
}
