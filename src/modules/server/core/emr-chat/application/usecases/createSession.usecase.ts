/**
 * createSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Creates a new EMR chat session. Called when the user sends their first
 * message in an empty chat.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TCreateEmrChatSession,
  TEmrChatSessionSummary,
} from "@/modules/entities/schemas/emr-chat/emr-chat.schema";

/**
 * Delegates session creation to the injected EmrChatService.
 *
 * @param dto - userId, optional orgId and title.
 * @returns The created session summary.
 */
export async function createSessionUseCase(
  dto: TCreateEmrChatSession,
): Promise<TEmrChatSessionSummary> {
  const service = getInjection("IEmrChatService");
  return service.createSession(dto);
}
