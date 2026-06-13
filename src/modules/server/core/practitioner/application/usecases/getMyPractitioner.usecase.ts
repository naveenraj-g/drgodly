/**
 * getMyPractitionerUseCase — resolves the Practitioner linked to the caller's user ID.
 *
 * Layer: server / core / practitioner / application / usecases
 *
 * Delegates to IPractitionersService resolved from the DI container.
 * The service implementation handles the list-then-fetch strategy.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Fetches the Practitioner record linked to the given user ID.
 *
 * @param userId - Auth user sub/UUID from the authenticated session.
 * @returns The matching Practitioner resource.
 * @throws NotFoundError when no Practitioner is linked to this user.
 */
export async function getMyPractitionerUseCase(
  userId: string,
): Promise<TPractitionerResponse> {
  const service = getInjection("IPractitionersService");
  return service.getMe(userId);
}
