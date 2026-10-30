/**
 * updateFlagUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: update Flag
 */

import {
  type TUpdateFlagDto,
  type TFlagResponse,
} from "@/modules/entities/schemas/flag";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates an existing Flag.
 *
 * @param id  - Public numeric identifier.
 * @param dto - Patchable fields.
 * @returns The updated Flag record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateFlagUseCase(
  id: number,
  dto: TUpdateFlagDto,
): Promise<TFlagResponse> {
  const service = getInjection("IFlagsService");
  return service.update(id, dto);
}
