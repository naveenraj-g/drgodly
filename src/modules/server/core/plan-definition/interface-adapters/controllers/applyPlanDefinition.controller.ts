/**
 * applyPlanDefinitionController — interface adapter for applying a PlanDefinition to a subject.
 *
 * Layer: interface-adapters / controllers
 * Operation: apply (FHIR `$apply`)
 */

import { ApplyPlanDefinitionValidationSchema } from "@/modules/entities/schemas/plan-definition";
import { type TApplyDefinitionResponse } from "@/modules/entities/schemas/definition-apply";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { applyPlanDefinitionUseCase } from "../../application/usecases/applyPlanDefinition.usecase";

function presenter(data: TApplyDefinitionResponse) {
  return data;
}

export type TApplyPlanDefinitionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id + apply body and runs the `$apply` operation.
 *
 * @param input - Raw input: `{ id: number, subject: string, ...applyBody }`.
 * @returns Generated ServiceRequests plus the skipped actions.
 * @throws InputParseError | ValidationError | NotFoundError | UnauthorizedError
 */
export async function applyPlanDefinitionController(
  input: unknown,
): Promise<TApplyPlanDefinitionControllerOutput> {
  const parsed = await ApplyPlanDefinitionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  // Split the path id from the request body before calling the service.
  const { id, ...dto } = parsed.data;
  const data = await applyPlanDefinitionUseCase(id, dto);
  return presenter(data);
}
