/**
 * applyPlanDefinitionUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: apply a PlanDefinition to a subject (FHIR `$apply`)
 */

import { type TApplyPlanDefinitionDto } from "@/modules/entities/schemas/plan-definition";
import { type TApplyDefinitionResponse } from "@/modules/entities/schemas/definition-apply";
import { getInjection } from "@/modules/server/di/container";

/**
 * Generates (preview or persist) the ServiceRequests of a PlanDefinition for a subject.
 *
 * @param id  - The fhir-gql public identifier.
 * @param dto - Apply body (subject, encounter, practitioner, persist, ...).
 * @returns Generated ServiceRequests plus the skipped actions.
 * @throws ValidationError | NotFoundError | UnauthorizedError | ForbiddenError | BadGatewayError
 */
export async function applyPlanDefinitionUseCase(
  id: number,
  dto: TApplyPlanDefinitionDto,
): Promise<TApplyDefinitionResponse> {
  const service = getInjection("IPlanDefinitionsService");
  return service.apply(id, dto);
}
