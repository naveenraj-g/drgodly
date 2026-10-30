/**
 * createQuestionnaireController — interface adapter for creating a Questionnaire.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 */

import {
  CreateQuestionnaireValidationSchema,
  type TQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createQuestionnaireUseCase } from "../../application/usecases/createQuestionnaire.usecase";

function presenter(data: TQuestionnaireResponse) {
  return data;
}

export type TCreateQuestionnaireControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates raw input and invokes createQuestionnaireUseCase.
 *
 * @param input - Raw input payload.
 * @returns The newly created Questionnaire.
 * @throws InputParseError | ValidationError | UnauthorizedError
 */
export async function createQuestionnaireController(
  input: unknown,
): Promise<TCreateQuestionnaireControllerOutput> {
  const parsed = await CreateQuestionnaireValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createQuestionnaireUseCase(parsed.data);
  return presenter(data);
}
