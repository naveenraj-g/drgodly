/**
 * listRiskAssessmentsUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: list RiskAssessments
 */

import {
  type TListRiskAssessmentsQuery,
  type TPaginatedRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists RiskAssessments via injected IRiskAssessmentsService.
 *
 * @param query - Optional query filters and pagination.
 * @returns Paginated RiskAssessments.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listRiskAssessmentsUseCase(
  query?: TListRiskAssessmentsQuery,
): Promise<TPaginatedRiskAssessmentResponse> {
  const service = getInjection("IRiskAssessmentsService");
  return service.list(query);
}
