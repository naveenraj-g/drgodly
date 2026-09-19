/**
 * renameSession controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Renames a session title from the history sidebar inline edit.
 */

import { renameSessionUseCase } from "../../application/usecases/renameSession.usecase";

/**
 * Updates the title of a session. Scoped to userId — a session owned by
 * another user cannot be renamed.
 *
 * @param id - Session UUID.
 * @param userId - Calling user's Better Auth ID.
 * @param title - New title provided by the user.
 * @throws NotFoundError if not found or owned by another user.
 */
export async function renameSessionController(
  id: string,
  userId: string,
  title: string,
): Promise<void> {
  await renameSessionUseCase(id, userId, title);
}
