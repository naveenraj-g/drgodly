/**
 * deleteVitalsUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: permanently delete a Vitals entry
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a vitals entry by its fhir-gql public identifier (irreversible).
 *
 * @param id - The fhir-gql public identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteVitalsUseCase(id: number): Promise<void> {
  const service = getInjection("IVitalsService");
  return service.delete(id);
}
