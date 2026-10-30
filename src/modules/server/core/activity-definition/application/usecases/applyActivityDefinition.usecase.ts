/**
 * applyActivityDefinitionUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: apply a ActivityDefinition to a subject (FHIR `$apply`)
 */

import { type TApplyActivityDefinitionDto } from "@/modules/entities/schemas/activity-definition";
import { type TApplyDefinitionResponse } from "@/modules/entities/schemas/definition-apply";
import { getInjection } from "@/modules/server/di/container";

/**
 * Generates (preview or persist) the ServiceRequests of a ActivityDefinition for a subject.
 *
 * @param id  - The fhir-gql public identifier.
 * @param dto - Apply body (subject, encounter, practitioner, persist, ...).
 * @returns Generated ServiceRequests plus the skipped actions.
 * @throws ValidationError | NotFoundError | UnauthorizedError | ForbiddenError | BadGatewayError
 */
export async function applyActivityDefinitionUseCase(
  id: number,
  dto: TApplyActivityDefinitionDto,
): Promise<TApplyDefinitionResponse> {
  const service = getInjection("IActivityDefinitionsService");
  return service.apply(id, dto);
}
