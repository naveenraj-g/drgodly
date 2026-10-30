/**
 * listProceduresUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: list Procedures with optional server-side filters and pagination
 *
 * Delegates to IProceduresService via the DI container.
 */

import {
  TListProceduresQuery,
  TPaginatedProcedureResponse,
} from "@/modules/entities/schemas/procedure";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists Procedures with optional filtering and pagination.
 *
 * @param query - Optional: status, code, patient, encounter, performer, org_id, user_id, limit, offset.
 * @returns Paginated result: { total, limit, offset, data }.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listProceduresUseCase(
  query?: TListProceduresQuery,
): Promise<TPaginatedProcedureResponse> {
  const service = getInjection("IProceduresService");
  return service.list(query);
}
