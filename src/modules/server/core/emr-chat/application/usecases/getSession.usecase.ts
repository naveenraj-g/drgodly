/**
 * getSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Loads a full session with all messages and the active workflow state.
 * Used when the user switches to an existing session in the sidebar.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TEmrChatSessionFull } from "@/modules/entities/schemas/emr-chat";

/**
 * Retrieves a session by ID including messages and active workflow.
 * Scoped to userId — a session owned by another user is treated as not found.
 *
 * @param id - Session UUID.
 * @param userId - Calling user's Better Auth ID.
 * @returns Full session data.
 * @throws NotFoundError if session does not exist or belongs to another user.
 */
export async function getSessionUseCase(
  id: string,
  userId: string,
): Promise<TEmrChatSessionFull> {
  const service = getInjection("IEmrChatRepository");
  return service.getSession(id, userId);
}
