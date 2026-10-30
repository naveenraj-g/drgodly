/**
 * getByIdProcedureUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: fetch a single Procedure by its public numeric ID
 */

import { TProcedureResponse } from "@/modules/entities/schemas/procedure";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single Procedure by its fhir-gql public identifier.
 *
 * @param id - The fhir-gql public identifier for this Procedure.
 * @returns The matching Procedure record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getByIdProcedureUseCase(id: number): Promise<TProcedureResponse> {
  const service = getInjection("IProceduresService");
  return service.getById(id);
}
