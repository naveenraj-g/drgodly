/**
 * a2ui/store — the active SessionStore implementation.
 *
 * Layer: server / a2ui
 *
 * Every session-actions.ts call goes through this single export. To wire a
 * real database, implement SessionStore (see session-store.ts) and swap the
 * import below — nothing else in the engine needs to change. See
 * ../../references/persistence-prisma-example.md for a copy-paste starting
 * point.
 */

import { MemorySessionStore } from "./memory-session-store";
import type { SessionStore } from "./session-store";

export const sessionStore: SessionStore = new MemorySessionStore();
