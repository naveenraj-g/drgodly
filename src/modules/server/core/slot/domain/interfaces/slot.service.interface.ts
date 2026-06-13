/**
 * ISlotService — domain interface for the Slot resource.
 *
 * Layer: server / core / slot / domain
 *
 * Defines the contract that all transport implementations (REST, GraphQL) must
 * satisfy. Use cases depend only on this interface; the concrete implementation
 * is resolved by the DI container at runtime.
 *
 * Slot has 5 operations — create, list, getById, update, delete.
 * There are no sub-resource CRUD routes; all child arrays are embedded in
 * the create payload and returned inline in every GET response.
 */

import {
  TSlotResponse,
  TPaginatedSlotResponse,
} from "@/modules/entities/schemas/slot";
import {
  TCreateSlot,
  TSlotPatchDto,
  TListSlotsQuery,
} from "@/modules/entities/schemas/slot";

/**
 * Contract for all Slot operations.
 * Implemented by SlotRestApiService and SlotGraphQLService.
 */
export interface ISlotService {
  /**
   * Creates a new Slot with all inline child arrays atomically.
   * @param dto - Creation payload. schedule and status are required.
   * @returns The created Slot resource.
   */
  create(dto: TCreateSlot): Promise<TSlotResponse>;

  /**
   * Lists Slots with optional filters and pagination.
   * Supports filtering by status, schedule_id, practitioner_role_id, user_id, org_id.
   * @param query - Optional filter/pagination params.
   * @returns Paginated list of Slots.
   */
  list(query?: TListSlotsQuery): Promise<TPaginatedSlotResponse>;

  /**
   * Fetches a single Slot by numeric ID.
   * @param id - Slot DB id.
   * @returns The Slot resource with all embedded child arrays.
   * @throws NotFoundError when the id does not exist.
   */
  getById(id: number): Promise<TSlotResponse>;

  /**
   * Patches scalar fields on an existing Slot.
   * Child arrays and schedule reference cannot be patched.
   * @param id - Slot DB id.
   * @param dto - Partial scalar fields to update.
   * @returns The updated Slot resource.
   */
  update(id: number, dto: TSlotPatchDto): Promise<TSlotResponse>;

  /**
   * Deletes a Slot record and all related child records (cascade).
   * @param id - Slot DB id.
   */
  delete(id: number): Promise<void>;
}
