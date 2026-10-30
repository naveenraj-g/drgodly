/**
 * updateRiskAssessmentController — interface adapter for patching a RiskAssessment.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  UpdateRiskAssessmentValidationSchema,
  type TRiskAssessmentResponse,
} from "@/modules/entities/schemas/risk-assessment";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateRiskAssessmentUseCase } from "../../application/usecases/updateRiskAssessment.usecase";

function presenter(data: TRiskAssessmentResponse) {
  return data;
}

export type TUpdateRiskAssessmentControllerOutput = ReturnType<
  typeof presenter
>;

/**
 * Validates the patch payload (including id) and updates the RiskAssessment.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated RiskAssessment.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updateRiskAssessmentController(
  input: unknown,
): Promise<TUpdateRiskAssessmentControllerOutput> {
  const parsed =
    await UpdateRiskAssessmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateRiskAssessmentUseCase(id, dto);
  return presenter(data);
}
