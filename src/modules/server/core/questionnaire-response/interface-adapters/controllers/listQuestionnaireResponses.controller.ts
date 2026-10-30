/**
 * listQuestionnaireResponsesController — interface adapter for listing QuestionnaireResponses.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListQuestionnaireResponsesValidationSchema,
  type TPaginatedQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listQuestionnaireResponsesUseCase } from "../../application/usecases/listQuestionnaireResponses.usecase";

function presenter(data: TPaginatedQuestionnaireResponseResponse) {
  return data;
}

export type TListQuestionnaireResponsesControllerOutput = ReturnType<
  typeof presenter
>;

/**
 * Validates query parameters and fetches paginated QuestionnaireResponses.
 *
 * @param input - Optional search query filters and pagination params.
 * @returns Paginated QuestionnaireResponses.
 * @throws InputParseError | UnauthorizedError
 */
export async function listQuestionnaireResponsesController(
  input: unknown,
): Promise<TListQuestionnaireResponsesControllerOutput> {
  const parsed =
    await ListQuestionnaireResponsesValidationSchema.safeParseAsync(
      input ?? {},
    );
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listQuestionnaireResponsesUseCase(parsed.data);
  return presenter(data);
}
