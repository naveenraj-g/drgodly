/**
 * renameSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Renames a session title. Called when the user edits the title inline
 * in the session history sidebar.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Updates the title of the given session. Scoped to userId — a session owned
 * by another user cannot be renamed.
 *
 * @param id - Session UUID.
 * @param userId - Calling user's Better Auth ID.
 * @param title - New user-provided title.
 * @throws NotFoundError if session does not exist or belongs to another user.
 */
export async function renameSessionUseCase(
  id: string,
  userId: string,
  title: string,
): Promise<void> {
  const service = getInjection("IEmrChatRepository");
  return service.updateSessionTitle(id, userId, title);
}
