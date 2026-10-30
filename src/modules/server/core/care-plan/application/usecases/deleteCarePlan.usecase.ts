/**
 * deleteCarePlanUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete CarePlan
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes a CarePlan by public ID.
 *
 * @param id - Public numeric identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteCarePlanUseCase(id: number): Promise<void> {
  const service = getInjection("ICarePlansService");
  return service.delete(id);
}
