/**
 * createTaskController — validates input and invokes the create use case.
 *
 * Layer: server / core / task / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateTaskValidationSchema,
  type TTaskResponse,
} from "@/modules/entities/schemas/task";
import { createTaskUseCase } from "../../application/usecases/createTask.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TTaskResponse) {
  return data;
}

export type TCreateTaskControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createTaskUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created Task resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createTaskController(
  input: unknown,
): Promise<TCreateTaskControllerOutput> {
  const parsed = await CreateTaskValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createTaskUseCase(parsed.data);
  return presenter(data);
}
