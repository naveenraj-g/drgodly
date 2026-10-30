/**
 * deleteProcedureUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: permanently delete a Procedure
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a Procedure by its fhir-gql public identifier (irreversible,
 * cascades to all child records).
 *
 * @param id - The fhir-gql public identifier.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteProcedureUseCase(id: number): Promise<void> {
  const service = getInjection("IProceduresService");
  return service.delete(id);
}
