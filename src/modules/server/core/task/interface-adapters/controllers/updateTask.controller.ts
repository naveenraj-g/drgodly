/**
 * updateTaskController — validates input and invokes the update use case.
 *
 * Layer: server / core / task / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateTaskValidationSchema,
  type TTaskResponse,
} from "@/modules/entities/schemas/task";
import { updateTaskUseCase } from "../../application/usecases/updateTask.usecase";

function presenter(data: TTaskResponse) {
  return data;
}

export type TUpdateTaskControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to updateTaskUseCase, and presents the result.
 *
 * @param input - Raw input containing `{ id: number, ...patchFields }`.
 * @returns The updated Task resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updateTaskController(
  input: unknown,
): Promise<TUpdateTaskControllerOutput> {
  const parsed = await UpdateTaskValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateTaskUseCase(id, dto);
  return presenter(data);
}
