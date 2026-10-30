/**
 * createActivityDefinitionUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create ActivityDefinition
 */

import {
  type TCreateActivityDefinition,
  type TActivityDefinitionResponse,
} from "@/modules/entities/schemas/activity-definition";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new ActivityDefinition via the injected IActivityDefinitionsService.
 *
 * @param dto - Create payload.
 * @returns The newly created ActivityDefinition record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createActivityDefinitionUseCase(
  dto: TCreateActivityDefinition,
): Promise<TActivityDefinitionResponse> {
  const service = getInjection("IActivityDefinitionsService");
  return service.create(dto);
}
