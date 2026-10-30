/**
 * listFlagsUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list Flags
 */

import {
  type TListFlagsQuery,
  type TPaginatedFlagResponse,
} from "@/modules/entities/schemas/flag";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists Flags matching query filters.
 *
 * @param query - Optional search/filter parameters.
 * @returns Paginated Flags response.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listFlagsUseCase(
  query?: TListFlagsQuery,
): Promise<TPaginatedFlagResponse> {
  const service = getInjection("IFlagsService");
  return service.list(query);
}
