/**
 * applyActivityDefinitionController — interface adapter for applying a ActivityDefinition to a subject.
 *
 * Layer: interface-adapters / controllers
 * Operation: apply (FHIR `$apply`)
 */

import { ApplyActivityDefinitionValidationSchema } from "@/modules/entities/schemas/activity-definition";
import { type TApplyDefinitionResponse } from "@/modules/entities/schemas/definition-apply";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { applyActivityDefinitionUseCase } from "../../application/usecases/applyActivityDefinition.usecase";

function presenter(data: TApplyDefinitionResponse) {
  return data;
}

export type TApplyActivityDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id + apply body and runs the `$apply` operation.
 *
 * @param input - Raw input: `{ id: number, subject: string, ...applyBody }`.
 * @returns Generated ServiceRequests plus the skipped actions.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function applyActivityDefinitionController(
  input: unknown,
): Promise<TApplyActivityDefinitionControllerOutput> {
  const parsed = await ApplyActivityDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  // Split the path id from the request body before calling the service.
  const { id, ...dto } = parsed.data;
  const data = await applyActivityDefinitionUseCase(id, dto);
  return presenter(data);
}
