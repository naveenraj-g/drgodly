/**
 * getQuestionnaireByIdController — interface adapter for fetching a Questionnaire by ID.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetQuestionnaireByIdValidationSchema,
  type TQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getQuestionnaireByIdUseCase } from "../../application/usecases/getQuestionnaireById.usecase";

function presenter(data: TQuestionnaireResponse) {
  return data;
}

export type TGetQuestionnaireByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the ID and fetches the matching Questionnaire.
 *
 * @param input - Raw input expected to contain `{ id: number }`.
 * @returns The Questionnaire record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getQuestionnaireByIdController(
  input: unknown,
): Promise<TGetQuestionnaireByIdControllerOutput> {
  const parsed = await GetQuestionnaireByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getQuestionnaireByIdUseCase(parsed.data.id);
  return presenter(data);
}
