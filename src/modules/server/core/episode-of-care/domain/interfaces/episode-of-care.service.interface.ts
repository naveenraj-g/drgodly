/**
 * EpisodeOfCare service domain interface.
 *
 * Layer: server / core / episode-of-care / domain
 */

import type {
  TCreateEpisodeOfCare,
  TUpdateEpisodeOfCareDto,
  TListEpisodeOfCaresQuery,
  TEpisodeOfCareResponse,
  TPaginatedEpisodeOfCareResponse,
} from "@/modules/entities/schemas/episode-of-care";

/**
 * Service contract for EpisodeOfCare CRUD operations.
 * Injected via IoC as `IEpisodeOfCaresService`.
 */
export interface IEpisodeOfCaresService {
  /**
   * Creates a new EpisodeOfCare.
   * @param dto - `status` and `patient` are required; everything else optional.
   */
  create(dto: TCreateEpisodeOfCare): Promise<TEpisodeOfCareResponse>;

  /**
   * Returns a paginated list of EpisodeOfCares with optional FHIR R4 search filters.
   * @param query - Filters (patient, status, organization, care_manager, condition, etc.).
   */
  list(query?: TListEpisodeOfCaresQuery): Promise<TPaginatedEpisodeOfCareResponse>;

  /**
   * Fetches a single EpisodeOfCare by its integer ID.
   * @param id - fhir-gql database ID.
   */
  getById(id: number): Promise<TEpisodeOfCareResponse>;

  /**
   * Partially updates an existing EpisodeOfCare. Child arrays use REPLACE semantics.
   * @param id - fhir-gql database ID.
   * @param dto - Patch payload.
   */
  update(id: number, dto: TUpdateEpisodeOfCareDto): Promise<TEpisodeOfCareResponse>;

  /**
   * Permanently deletes an EpisodeOfCare.
   * @param id - fhir-gql database ID.
   */
  delete(id: number): Promise<void>;
}
