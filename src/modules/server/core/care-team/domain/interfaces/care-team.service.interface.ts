/**
 * CareTeam service domain interface.
 *
 * Layer: server / core / care-team / domain
 */

import type {
  TCreateCareTeam,
  TUpdateCareTeamDto,
  TListCareTeamsQuery,
  TCareTeamResponse,
  TPaginatedCareTeamResponse,
} from "@/modules/entities/schemas/care-team";

/**
 * Service contract for CareTeam CRUD operations.
 * Injected via IoC as `ICareTeamsService`.
 */
export interface ICareTeamsService {
  /**
   * Creates a new CareTeam.
   * @param dto - All fields optional per FHIR R4.
   */
  create(dto: TCreateCareTeam): Promise<TCareTeamResponse>;

  /**
   * Returns a paginated list of CareTeams with optional filters.
   * @param query - Filters (status, subject, patient, encounter, participant, limit, offset).
   */
  list(query?: TListCareTeamsQuery): Promise<TPaginatedCareTeamResponse>;

  /**
   * Fetches a single CareTeam by its integer ID.
   * @param id - fhir-gql database ID.
   */
  getById(id: number): Promise<TCareTeamResponse>;

  /**
   * Partially updates a CareTeam — scalar fields and replace-semantics child arrays.
   * @param id - fhir-gql database ID.
   * @param dto - Patch payload.
   */
  update(id: number, dto: TUpdateCareTeamDto): Promise<TCareTeamResponse>;

  /**
   * Permanently deletes a CareTeam and all its child records (cascade).
   * @param id - fhir-gql database ID.
   */
  delete(id: number): Promise<void>;
}
