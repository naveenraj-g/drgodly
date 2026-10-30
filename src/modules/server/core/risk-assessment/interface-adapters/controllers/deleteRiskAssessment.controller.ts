/**
 * deleteRiskAssessmentController — interface adapter for deleting a RiskAssessment.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeleteRiskAssessmentValidationSchema } from "@/modules/entities/schemas/risk-assessment";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteRiskAssessmentUseCase } from "../../application/usecases/deleteRiskAssessment.usecase";

/**
 * Validates `{ id: number }` input and deletes the RiskAssessment.
 *
 * @param input - Raw input containing `{ id: number }`.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteRiskAssessmentController(
  input: unknown,
): Promise<void> {
  const parsed =
    await DeleteRiskAssessmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteRiskAssessmentUseCase(parsed.data.id);
}
