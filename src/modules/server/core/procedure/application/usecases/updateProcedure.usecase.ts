/**
 * updateProcedureUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: partially update a Procedure (scalar/reference fields + REPLACE-semantics child arrays)
 */

import {
  TProcedureResponse,
  TUpdateProcedureDto,
} from "@/modules/entities/schemas/procedure";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates a Procedure with the given patchable fields.
 *
 * @param id  - The fhir-gql public identifier.
 * @param dto - Fields to patch (at least one required).
 * @returns The updated Procedure record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateProcedureUseCase(
  id: number,
  dto: TUpdateProcedureDto,
): Promise<TProcedureResponse> {
  const service = getInjection("IProceduresService");
  return service.update(id, dto);
}
