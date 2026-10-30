/**
 * createRiskAssessmentController — interface adapter for creating a RiskAssessment.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreateRiskAssessmentValidationSchema,
  type TRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createRiskAssessmentUseCase } from "../../application/usecases/createRiskAssessment.usecase";

function presenter(data: TRiskAssessmentResponse) {
  return data;
}

export type TCreateRiskAssessmentControllerOutput = ReturnType<
  typeof presenter
>;

/**
 * Validates raw input and invokes createRiskAssessmentUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created RiskAssessment.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createRiskAssessmentController(
  input: unknown,
): Promise<TCreateRiskAssessmentControllerOutput> {
  const parsed =
    await CreateRiskAssessmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createRiskAssessmentUseCase(parsed.data);
  return presenter(data);
}
