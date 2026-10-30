/**
 * listCarePlansUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list CarePlans
 */

import {
  type TListCarePlansQuery,
  type TPaginatedCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists CarePlans matching query filters.
 *
 * @param query - Optional search/filter parameters.
 * @returns Paginated CarePlans response.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listCarePlansUseCase(
  query?: TListCarePlansQuery,
): Promise<TPaginatedCarePlanResponse> {
  const service = getInjection("ICarePlansService");
  return service.list(query);
}
