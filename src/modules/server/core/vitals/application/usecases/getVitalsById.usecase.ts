/**
 * getVitalsByIdUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: fetch a single Vitals entry by its public numeric ID
 */

import { TVitalsResponse } from "@/modules/entities/schemas/vitals";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single vitals entry by its fhir-gql public identifier.
 *
 * @param id - The fhir-gql public identifier for this vitals entry.
 * @returns The matching vitals record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getVitalsByIdUseCase(id: number): Promise<TVitalsResponse> {
  const service = getInjection("IVitalsService");
  return service.getById(id);
}
