/**
 * deleteQuestionnaireController — interface adapter for deleting a Questionnaire.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete
 */

import { DeleteQuestionnaireValidationSchema } from "@/modules/entities/schemas/questionnaire";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteQuestionnaireUseCase } from "../../application/usecases/deleteQuestionnaire.usecase";

function presenter() {
  return { success: true };
}

export type TDeleteQuestionnaireControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and permanently deletes the Questionnaire.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns Success confirmation.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteQuestionnaireController(
  input: unknown,
): Promise<TDeleteQuestionnaireControllerOutput> {
  const parsed = await DeleteQuestionnaireValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteQuestionnaireUseCase(parsed.data.id);
  return presenter();
}
