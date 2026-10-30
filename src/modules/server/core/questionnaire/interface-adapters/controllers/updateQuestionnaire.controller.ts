/**
 * updateQuestionnaireController — interface adapter for patching a Questionnaire.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  UpdateQuestionnaireValidationSchema,
  type TQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateQuestionnaireUseCase } from "../../application/usecases/updateQuestionnaire.usecase";

function presenter(data: TQuestionnaireResponse) {
  return data;
}

export type TUpdateQuestionnaireControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload (including id) and updates the Questionnaire.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated Questionnaire.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updateQuestionnaireController(
  input: unknown,
): Promise<TUpdateQuestionnaireControllerOutput> {
  const parsed = await UpdateQuestionnaireValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateQuestionnaireUseCase(id, dto);
  return presenter(data);
}
