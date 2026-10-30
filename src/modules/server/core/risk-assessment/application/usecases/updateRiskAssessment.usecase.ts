/**
 * updateRiskAssessmentUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update RiskAssessment
 */

import {
  type TUpdateRiskAssessmentDto,
  type TRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
import { getInjection } from "@/modules/server/di/container";

/**
 * Updates a RiskAssessment by ID via injected IRiskAssessmentsService.
 *
 * @param id - Public numeric ID.
 * @param dto - Fields to patch.
 * @returns Updated RiskAssessment record.
 * @throws NotFoundError | ValidationError | UnauthorizedError | BadGatewayError
 */
export async function updateRiskAssessmentUseCase(
  id: number,
  dto: TUpdateRiskAssessmentDto,
): Promise<TRiskAssessmentResponse> {
  const service = getInjection("IRiskAssessmentsService");
  return service.update(id, dto);
}
