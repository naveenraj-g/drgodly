/**
 * deleteRiskAssessmentUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: delete RiskAssessment
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes a RiskAssessment by ID via injected IRiskAssessmentsService.
 *
 * @param id - Public numeric ID.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteRiskAssessmentUseCase(id: number): Promise<void> {
  const service = getInjection("IRiskAssessmentsService");
  return service.delete(id);
}
