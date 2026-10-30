/**
 * listQuestionnairesController — interface adapter for listing Questionnaires.
 *
 * Layer: interface-adapters / controllers
 * Operation: list
 */

import {
  ListQuestionnairesValidationSchema,
  type TPaginatedQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listQuestionnairesUseCase } from "../../application/usecases/listQuestionnaires.usecase";

function presenter(data: TPaginatedQuestionnaireResponse) {
  return data;
}

export type TListQuestionnairesControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates search query and invokes listQuestionnairesUseCase.
 *
 * @param input - Optional raw query filters.
 * @returns Paginated Questionnaires list.
 * @throws InputParseError | UnauthorizedError
 */
export async function listQuestionnairesController(
  input: unknown,
): Promise<TListQuestionnairesControllerOutput> {
  const parsed = await ListQuestionnairesValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listQuestionnairesUseCase(parsed.data);
  return presenter(data);
}
