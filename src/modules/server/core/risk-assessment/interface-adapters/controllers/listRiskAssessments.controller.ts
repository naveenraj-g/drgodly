/**
 * listRiskAssessmentsController — interface adapter for listing RiskAssessments.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListRiskAssessmentsValidationSchema,
  type TPaginatedRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listRiskAssessmentsUseCase } from "../../application/usecases/listRiskAssessments.usecase";

function presenter(data: TPaginatedRiskAssessmentResponse) {
  return data;
}

export type TListRiskAssessmentsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates query parameters and fetches paginated RiskAssessments.
 *
 * @param input - Optional search query filters and pagination params.
 * @returns Paginated RiskAssessments.
 * @throws InputParseError | UnauthorizedError
 */
export async function listRiskAssessmentsController(
  input: unknown,
): Promise<TListRiskAssessmentsControllerOutput> {
  const parsed =
    await ListRiskAssessmentsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listRiskAssessmentsUseCase(parsed.data);
  return presenter(data);
}
