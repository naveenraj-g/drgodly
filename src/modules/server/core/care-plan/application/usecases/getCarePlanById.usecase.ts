/**
 * getCarePlanByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: fetch a single CarePlan by ID
 */

import { type TCarePlanResponse } from "@/modules/entities/schemas/care-plan";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single CarePlan by its public ID.
 *
 * @param id - The fhir-gql public identifier.
 * @returns The matching CarePlan record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getCarePlanByIdUseCase(
  id: number,
): Promise<TCarePlanResponse> {
  const service = getInjection("ICarePlansService");
  return service.getById(id);
}
