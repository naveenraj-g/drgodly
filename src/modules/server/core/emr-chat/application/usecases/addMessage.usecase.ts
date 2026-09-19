/**
 * addMessage use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Persists a single chat message (user or assistant) to the active session.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TAddEmrChatMessage,
  TEmrChatMessage,
} from "@/modules/entities/schemas/emr-chat";

/**
 * Appends a message to a session. Scoped to userId — the target session
 * must belong to the calling user.
 *
 * @param dto - sessionId, role, content, type, optional metadata.
 * @param userId - Calling user's Better Auth ID.
 * @returns The created message.
 * @throws NotFoundError if the session does not exist or belongs to another user.
 */
export async function addMessageUseCase(
  dto: TAddEmrChatMessage,
  userId: string,
): Promise<TEmrChatMessage> {
  const service = getInjection("IEmrChatRepository");
  return service.addMessage(dto, userId);
}
