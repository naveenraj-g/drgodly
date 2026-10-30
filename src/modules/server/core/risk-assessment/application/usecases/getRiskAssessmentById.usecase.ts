/**
 * getRiskAssessmentByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: get RiskAssessment by ID
 */

import { type TRiskAssessmentResponse } from "@/modules/entities/schemas/risk-assessment";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single RiskAssessment by ID via injected IRiskAssessmentsService.
 *
 * @param id - Public numeric ID.
 * @returns RiskAssessment record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getRiskAssessmentByIdUseCase(
  id: number,
): Promise<TRiskAssessmentResponse> {
  const service = getInjection("IRiskAssessmentsService");
  return service.getById(id);
}
