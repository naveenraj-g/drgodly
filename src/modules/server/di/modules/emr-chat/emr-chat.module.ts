/**
 * EMR Chat DI module.
 *
 * Layer: server / di / modules / emr-chat
 *
 * Registers the concrete EmrChatService (Prisma) with the IoC container under
 * the IEmrChatService symbol. Unlike REST services, this service never switches
 * transports — it always uses Prisma.
 */

import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { EmrChatService } from "@/modules/server/core/emr-chat/infrastructure/services/emr-chat.service";

/**
 * Binds EmrChatService to its interface symbol in the container.
 *
 * @param container - The application IoC container.
 */
export function registerEmrChatModule(container: Container): void {
  container.bind(DI_SYMBOLS.IEmrChatService).toClass(EmrChatService);
}
