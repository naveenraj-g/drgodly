/**
 * pinSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Pins or unpins a session so it floats to the top of the sidebar list.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Toggles the pinned state of the given session. Scoped to userId — a
 * session owned by another user cannot be pinned/unpinned.
 *
 * @param id - Session UUID.
 * @param userId - Calling user's Better Auth ID.
 * @param pinned - True to pin, false to unpin.
 * @throws NotFoundError if session does not exist or belongs to another user.
 */
export async function pinSessionUseCase(
  id: string,
  userId: string,
  pinned: boolean,
): Promise<void> {
  const service = getInjection("IEmrChatRepository");
  return service.pinSession(id, userId, pinned);
}
