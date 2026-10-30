/**
 * getTaskByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / task / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdTaskValidationSchema,
  type TTaskResponse,
} from "@/modules/entities/schemas/task";
import { getTaskByIdUseCase } from "../../application/usecases/getTaskById.usecase";

function presenter(data: TTaskResponse) {
  return data;
}

export type TGetTaskByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getTaskByIdUseCase, and presents the result.
 *
 * @param input - Raw input containing `{ id: number }`.
 * @returns The Task resource.
 * @throws InputParseError on schema validation failure.
 */
export async function getTaskByIdController(
  input: unknown,
): Promise<TGetTaskByIdControllerOutput> {
  const parsed = await GetByIdTaskValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getTaskByIdUseCase(parsed.data.id);
  return presenter(data);
}
