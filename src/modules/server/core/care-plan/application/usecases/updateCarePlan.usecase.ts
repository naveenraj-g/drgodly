/**
 * updateCarePlanUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update CarePlan
 */

import {
  type TUpdateCarePlanDto,
  type TCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates an existing CarePlan.
 *
 * @param id  - Public numeric identifier.
 * @param dto - Patchable fields.
 * @returns The updated CarePlan record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateCarePlanUseCase(
  id: number,
  dto: TUpdateCarePlanDto,
): Promise<TCarePlanResponse> {
  const service = getInjection("ICarePlansService");
  return service.update(id, dto);
}
