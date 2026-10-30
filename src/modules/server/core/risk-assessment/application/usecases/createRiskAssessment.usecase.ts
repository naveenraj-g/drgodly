/**
 * createRiskAssessmentUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create RiskAssessment
 */

import {
  type TCreateRiskAssessment,
  type TRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new RiskAssessment via injected IRiskAssessmentsService.
 *
 * @param dto - Create payload.
 * @returns The newly created RiskAssessment record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createRiskAssessmentUseCase(
  dto: TCreateRiskAssessment,
): Promise<TRiskAssessmentResponse> {
  const service = getInjection("IRiskAssessmentsService");
  return service.create(dto);
}
