/**
 * createProcedureUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: create a new Procedure
 *
 * Delegates to IProceduresService via the DI container.
 * Contains no business logic — validation is the controller's responsibility.
 */

import { TCreateProcedure, TProcedureResponse } from "@/modules/entities/schemas/procedure";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new Procedure via the injected ProceduresService.
 *
 * @param dto - Validated creation payload.
 * @returns The newly created Procedure record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createProcedureUseCase(dto: TCreateProcedure): Promise<TProcedureResponse> {
  const service = getInjection("IProceduresService");
  return service.create(dto);
}
