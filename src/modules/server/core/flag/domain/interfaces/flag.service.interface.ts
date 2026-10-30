/**
 * IFlagsService domain interface.
 *
 * Layer: domain / interfaces
 * Resource: Flag (FHIR R4)
 *
 * Implemented by FlagRestApiService (REST) and FlagGraphQLService (GraphQL).
 */

import {
  type TCreateFlag,
  type TUpdateFlagDto,
  type TListFlagsQuery,
  type TFlagResponse,
  type TPaginatedFlagResponse,
} from "@/modules/entities/schemas/flag";

export interface IFlagsService {
  /**
   * Creates a new Flag.
   *
   * @param dto - Flag create payload.
   * @returns Newly created Flag response.
   */
  create(dto: TCreateFlag): Promise<TFlagResponse>;

  /**
   * Returns a paginated list of Flags matching query filters.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated Flags response.
   */
  list(query?: TListFlagsQuery): Promise<TPaginatedFlagResponse>;

  /**
   * Fetches a Flag by numeric ID.
   *
   * @param id - Public numeric ID of the Flag.
   * @returns Flag record.
   */
  getById(id: number): Promise<TFlagResponse>;

  /**
   * Partially updates a Flag by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Updated Flag record.
   */
  update(id: number, dto: TUpdateFlagDto): Promise<TFlagResponse>;

  /**
   * Permanently deletes a Flag.
   *
   * @param id - Public numeric ID.
   */
  delete(id: number): Promise<void>;
}
