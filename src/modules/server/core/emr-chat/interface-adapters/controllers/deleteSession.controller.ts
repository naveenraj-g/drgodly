/**
 * deleteSession controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Archives a session so it no longer appears in the sidebar. The ID comes from
 * the action input and needs no additional schema validation here.
 */

import { deleteSessionUseCase } from "../../application/usecases/deleteSession.usecase";

/**
 * Archives a session by ID. Scoped to userId — a session owned by another
 * user cannot be archived.
 *
 * @param id - Session UUID.
 * @param userId - Calling user's Better Auth ID.
 * @throws NotFoundError if not found or owned by another user.
 */
export async function deleteSessionController(id: string, userId: string): Promise<void> {
  await deleteSessionUseCase(id, userId);
}
