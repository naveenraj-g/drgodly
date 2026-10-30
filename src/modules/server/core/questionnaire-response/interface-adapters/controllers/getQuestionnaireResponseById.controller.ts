/**
 * getQuestionnaireResponseByIdController — interface adapter for fetching a QuestionnaireResponse by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetQuestionnaireResponseByIdValidationSchema,
  type TQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getQuestionnaireResponseByIdUseCase } from "../../application/usecases/getQuestionnaireResponseById.usecase";

function presenter(data: TQuestionnaireResponseResponse) {
  return data;
}

export type TGetQuestionnaireResponseByIdControllerOutput = ReturnType<
  typeof presenter
>;

/**
 * Validates `{ id: number }` input and fetches the QuestionnaireResponse.
 *
 * @param input - Raw input containing `{ id: number }`.
 * @returns The requested QuestionnaireResponse.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getQuestionnaireResponseByIdController(
  input: unknown,
): Promise<TGetQuestionnaireResponseByIdControllerOutput> {
  const parsed =
    await GetQuestionnaireResponseByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getQuestionnaireResponseByIdUseCase(parsed.data.id);
  return presenter(data);
}
