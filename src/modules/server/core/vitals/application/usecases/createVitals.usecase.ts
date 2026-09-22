/**
 * createVitalsUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: record a new Vitals entry
 *
 * Delegates to IVitalsService via the DI container.
 * Contains no business logic — validation is the controller's responsibility.
 */

import { TCreateVitals, TVitalsResponse } from "@/modules/entities/schemas/vitals";
import { getInjection } from "@/modules/server/di/container";

/**
 * Records a new vitals entry via the injected VitalsService.
 *
 * @param dto - Validated creation payload.
 * @returns The newly created vitals record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createVitalsUseCase(dto: TCreateVitals): Promise<TVitalsResponse> {
  const service = getInjection("IVitalsService");
  return service.create(dto);
}
