/**
 * createQuestionnaireResponseController — interface adapter for creating a QuestionnaireResponse.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreateQuestionnaireResponseValidationSchema,
  type TQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createQuestionnaireResponseUseCase } from "../../application/usecases/createQuestionnaireResponse.usecase";

function presenter(data: TQuestionnaireResponseResponse) {
  return data;
}

export type TCreateQuestionnaireResponseControllerOutput = ReturnType<
  typeof presenter
>;

/**
 * Validates raw input and invokes createQuestionnaireResponseUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created QuestionnaireResponse.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createQuestionnaireResponseController(
  input: unknown,
): Promise<TCreateQuestionnaireResponseControllerOutput> {
  const parsed =
    await CreateQuestionnaireResponseValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createQuestionnaireResponseUseCase(parsed.data);
  return presenter(data);
}
