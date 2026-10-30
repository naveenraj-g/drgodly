/**
 * listProceduresController — interface adapter for listing Procedures.
 *
 * Layer: interface-adapters / controllers
 * Operation: list (paginated, filterable)
 *
 * Accepts optional query parameters. When no input is provided (undefined/null),
 * the use case is called with no filters and the server defaults apply.
 */

import {
  ListProceduresValidationSchema,
  TPaginatedProcedureResponse,
} from "@/modules/entities/schemas/procedure";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listProceduresUseCase } from "../../application/usecases/listProcedures.usecase";

/** Pass-through presenter — returns the paginated result as-is. */
function presenter(data: TPaginatedProcedureResponse) {
  return data;
}

export type TListProceduresControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates optional query params and lists Procedures.
 *
 * @param input - Optional raw query params (status, code, patient, encounter, performer, org_id, user_id, limit, offset).
 * @returns Paginated Procedure list.
 * @throws InputParseError on Zod validation failure.
 */
export async function listProceduresController(
  input?: unknown,
): Promise<TListProceduresControllerOutput> {
  if (input === undefined || input === null) {
    const data = await listProceduresUseCase();
    return presenter(data);
  }
  const parsed = await ListProceduresValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listProceduresUseCase(parsed.data);
  return presenter(data);
}
