/**
 * deleteFlagUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete Flag
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes a Flag by public ID.
 *
 * @param id - Public numeric identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteFlagUseCase(id: number): Promise<void> {
  const service = getInjection("IFlagsService");
  return service.delete(id);
}
