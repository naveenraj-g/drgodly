/**
 * deleteQuestionnaireResponseController — interface adapter for deleting a QuestionnaireResponse.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeleteQuestionnaireResponseValidationSchema } from "@/modules/entities/schemas/questionnaire-response";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteQuestionnaireResponseUseCase } from "../../application/usecases/deleteQuestionnaireResponse.usecase";

/**
 * Validates `{ id: number }` input and deletes the QuestionnaireResponse.
 *
 * @param input - Raw input containing `{ id: number }`.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteQuestionnaireResponseController(
  input: unknown,
): Promise<void> {
  const parsed =
    await DeleteQuestionnaireResponseValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteQuestionnaireResponseUseCase(parsed.data.id);
}
