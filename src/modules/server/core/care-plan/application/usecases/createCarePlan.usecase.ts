/**
 * createCarePlanUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create CarePlan
 */

import {
  type TCreateCarePlan,
  type TCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new CarePlan via injected ICarePlansService.
 *
 * @param dto - Create payload.
 * @returns The newly created CarePlan record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createCarePlanUseCase(
  dto: TCreateCarePlan,
): Promise<TCarePlanResponse> {
  const service = getInjection("ICarePlansService");
  return service.create(dto);
}
