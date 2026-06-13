/**
 * getMyPractitionerController — validates userId input and invokes the getMe use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetMyPractitionerValidationSchema,
  type TPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";
import { getMyPractitionerUseCase } from "../../application/usecases/getMyPractitioner.usecase";

function presenter(data: TPractitionerResponse) {
  return data;
}

export type TGetMyPractitionerControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { userId } from the input and resolves the Practitioner for that user.
 *
 * @param input - Raw unknown value containing { userId: string }.
 * @returns The Practitioner resource linked to the given user.
 * @throws InputParseError on schema validation failure.
 */
export async function getMyPractitionerController(
  input: unknown,
): Promise<TGetMyPractitionerControllerOutput> {
  const parsed = await GetMyPractitionerValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getMyPractitionerUseCase(parsed.data.userId);
  return presenter(data);
}
