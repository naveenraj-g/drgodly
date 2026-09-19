/**
 * pinSession controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Pins or unpins a session in the sidebar list.
 */

import { pinSessionUseCase } from "../../application/usecases/pinSession.usecase";

/**
 * Toggles the pinned state of a session. Scoped to userId — a session owned
 * by another user cannot be pinned/unpinned.
 *
 * @param id - Session UUID.
 * @param userId - Calling user's Better Auth ID.
 * @param pinned - True to pin, false to unpin.
 * @throws NotFoundError if not found or owned by another user.
 */
export async function pinSessionController(
  id: string,
  userId: string,
  pinned: boolean,
): Promise<void> {
  await pinSessionUseCase(id, userId, pinned);
}
