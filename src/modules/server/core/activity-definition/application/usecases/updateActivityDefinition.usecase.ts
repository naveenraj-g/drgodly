/**
 * updateActivityDefinitionUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update ActivityDefinition
 */

import {
  type TPatchActivityDefinitionDto,
  type TActivityDefinitionResponse,
} from "@/modules/entities/schemas/activity-definition";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates an existing ActivityDefinition.
 *
 * @param id  - Public numeric identifier.
 * @param dto - Patchable fields.
 * @returns The updated ActivityDefinition record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateActivityDefinitionUseCase(
  id: number,
  dto: TPatchActivityDefinitionDto,
): Promise<TActivityDefinitionResponse> {
  const service = getInjection("IActivityDefinitionsService");
  return service.update(id, dto);
}
