/**
 * listVitalsUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: list vitals entries with optional server-side filters and pagination
 *
 * Delegates to IVitalsService via the DI container.
 */

import {
  TListVitalsQuery,
  TPaginatedVitalsResponse,
} from "@/modules/entities/schemas/vitals";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists vitals entries with optional filtering and pagination.
 *
 * @param query - Optional: user_id, patient_id, org_id, date, recorded_at range, limit, offset.
 * @returns Paginated result: { total, limit, offset, data }.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listVitalsUseCase(
  query?: TListVitalsQuery,
): Promise<TPaginatedVitalsResponse> {
  const service = getInjection("IVitalsService");
  return service.list(query);
}
