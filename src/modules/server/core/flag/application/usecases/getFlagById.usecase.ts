/**
 * getFlagByIdUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: fetch a single Flag by ID
 */

import { type TFlagResponse } from "@/modules/entities/schemas/flag";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single Flag by its public ID.
 *
 * @param id - The fhir-gql public identifier.
 * @returns The matching Flag record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getFlagByIdUseCase(
  id: number,
): Promise<TFlagResponse> {
  const service = getInjection("IFlagsService");
  return service.getById(id);
}
