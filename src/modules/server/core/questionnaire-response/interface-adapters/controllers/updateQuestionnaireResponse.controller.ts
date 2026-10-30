/**
 * updateQuestionnaireResponseController — interface adapter for patching a QuestionnaireResponse.
 *
 * Layer: interface-adapters / controllers
 * Operation: update
 */

import {
  UpdateQuestionnaireResponseValidationSchema,
  type TQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateQuestionnaireResponseUseCase } from "../../application/usecases/updateQuestionnaireResponse.usecase";

function presenter(data: TQuestionnaireResponseResponse) {
  return data;
}

export type TUpdateQuestionnaireResponseControllerOutput = ReturnType<
  typeof presenter
>;

/**
 * Validates the patch payload (including id) and updates the QuestionnaireResponse.
 *
 * @param input - Raw payload containing `{ id: number, ...patchFields }`.
 * @returns The updated QuestionnaireResponse.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function updateQuestionnaireResponseController(
  input: unknown,
): Promise<TUpdateQuestionnaireResponseControllerOutput> {
  const parsed =
    await UpdateQuestionnaireResponseValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateQuestionnaireResponseUseCase(id, dto);
  return presenter(data);
}
