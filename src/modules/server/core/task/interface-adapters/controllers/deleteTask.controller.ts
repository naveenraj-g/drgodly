/**
 * deleteTaskController — validates input and invokes the delete use case.
 *
 * Layer: server / core / task / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteTaskValidationSchema } from "@/modules/entities/schemas/task";
import { deleteTaskUseCase } from "../../application/usecases/deleteTask.usecase";

function presenter() {
  return { success: true };
}

export type TDeleteTaskControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to deleteTaskUseCase, and presents the result.
 *
 * @param input - Raw input containing `{ id: number }`.
 * @returns Success confirmation.
 * @throws InputParseError on schema validation failure.
 */
export async function deleteTaskController(
  input: unknown,
): Promise<TDeleteTaskControllerOutput> {
  const parsed = await DeleteTaskValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteTaskUseCase(parsed.data.id);
  return presenter();
}
