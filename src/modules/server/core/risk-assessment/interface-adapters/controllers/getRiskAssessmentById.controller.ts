/**
 * getRiskAssessmentByIdController — interface adapter for fetching a RiskAssessment by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetByIdRiskAssessmentValidationSchema,
  type TRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getRiskAssessmentByIdUseCase } from "../../application/usecases/getRiskAssessmentById.usecase";

function presenter(data: TRiskAssessmentResponse) {
  return data;
}

export type TGetRiskAssessmentByIdControllerOutput = ReturnType<
  typeof presenter
>;

/**
 * Validates `{ id: number }` input and fetches the RiskAssessment.
 *
 * @param input - Raw input containing `{ id: number }`.
 * @returns The requested RiskAssessment.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getRiskAssessmentByIdController(
  input: unknown,
): Promise<TGetRiskAssessmentByIdControllerOutput> {
  const parsed =
    await GetByIdRiskAssessmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getRiskAssessmentByIdUseCase(parsed.data.id);
  return presenter(data);
}
