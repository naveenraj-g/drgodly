/**
 * listSessions use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Returns the paginated session list for the sidebar history drawer.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TListEmrChatSessions,
  TEmrChatSessionSummary,
} from "@/modules/entities/schemas/emr-chat/emr-chat.schema";

/**
 * Lists sessions for the given user, most recent first.
 *
 * @param query - userId, optional cursor and limit.
 * @returns Array of session summary rows.
 */
export async function listSessionsUseCase(
  query: TListEmrChatSessions,
): Promise<TEmrChatSessionSummary[]> {
  const service = getInjection("IEmrChatService");
  return service.listSessions(query);
}
