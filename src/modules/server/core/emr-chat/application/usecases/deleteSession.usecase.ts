/**
 * deleteSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Archives a session so it disappears from the sidebar. Data is retained for
 * compliance — nothing is physically deleted.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Archives the given session. Scoped to userId — a session owned by another
 * user cannot be archived.
 *
 * @param id - Session UUID.
 * @param userId - Calling user's Better Auth ID.
 * @throws NotFoundError if session does not exist or belongs to another user.
 */
export async function deleteSessionUseCase(id: string, userId: string): Promise<void> {
  const service = getInjection("IEmrChatRepository");
  return service.deleteSession(id, userId);
}
