/**
 * listVitalsController — interface adapter for listing Vitals entries.
 *
 * Layer: interface-adapters / controllers
 * Operation: list (paginated, filterable)
 *
 * Accepts optional query parameters. When no input is provided (undefined/null),
 * the use case is called with no filters and the server defaults apply.
 */

import {
  ListVitalsValidationSchema,
  TPaginatedVitalsResponse,
} from "@/modules/entities/schemas/vitals";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listVitalsUseCase } from "../../application/usecases/listVitals.usecase";

/** Pass-through presenter — returns the paginated result as-is. */
function presenter(data: TPaginatedVitalsResponse) {
  return data;
}

export type TListVitalsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates optional query params and lists vitals entries.
 *
 * @param input - Optional raw query params (user_id, patient_id, org_id, date, recorded_at range, limit, offset).
 * @returns Paginated vitals list.
 * @throws InputParseError on Zod validation failure.
 */
export async function listVitalsController(
  input?: unknown,
): Promise<TListVitalsControllerOutput> {
  // Allow calling with no args — just fetch with server defaults
  if (input === undefined || input === null) {
    const data = await listVitalsUseCase();
    return presenter(data);
  }
  const parsed = await ListVitalsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listVitalsUseCase(parsed.data);
  return presenter(data);
}
