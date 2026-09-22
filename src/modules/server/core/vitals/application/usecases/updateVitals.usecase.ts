/**
 * updateVitalsUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: partially update a Vitals entry (PATCH — metric fields only)
 */

import {
  TVitalsResponse,
  TPatchVitalsDto,
} from "@/modules/entities/schemas/vitals";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates a vitals entry with the given patchable fields.
 *
 * @param id  - The fhir-gql public identifier.
 * @param dto - Fields to patch (at least one required).
 * @returns The updated vitals record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateVitalsUseCase(
  id: number,
  dto: TPatchVitalsDto,
): Promise<TVitalsResponse> {
  const service = getInjection("IVitalsService");
  return service.update(id, dto);
}
