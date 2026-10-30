/**
 * listTasksController — validates input and invokes the list use case.
 *
 * Layer: server / core / task / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListTasksValidationSchema,
  type TPaginatedTaskResponse,
} from "@/modules/entities/schemas/task";
import { listTasksUseCase } from "../../application/usecases/listTasks.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedTaskResponse) {
  return data;
}

export type TListTasksControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw query input, delegates to listTasksUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (all fields optional).
 * @returns Paginated Task list.
 * @throws InputParseError on schema validation failure.
 */
export async function listTasksController(
  input: unknown,
): Promise<TListTasksControllerOutput> {
  const parsed = await ListTasksValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listTasksUseCase(parsed.data);
  return presenter(data);
}
