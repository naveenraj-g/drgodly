/**
 * createFlagUseCase — application layer use case.
 *
 * Layer: application / usecases
 * Operation: create Flag
 */

import {
  type TCreateFlag,
  type TFlagResponse,
} from "@/modules/entities/schemas/flag";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new Flag via injected IFlagsService.
 *
 * @param dto - Create payload.
 * @returns The newly created Flag record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createFlagUseCase(
  dto: TCreateFlag,
): Promise<TFlagResponse> {
  const service = getInjection("IFlagsService");
  return service.create(dto);
}
