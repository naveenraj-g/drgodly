/**
 * EpisodeOfCareGraphQLService — GraphQL transport stub for IEpisodeOfCaresService.
 *
 * Layer: server / core / episode-of-care / infrastructure / services
 *
 * Not yet implemented. Bound by the DI module when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use EpisodeOfCareRestApiService instead.
 */

import { IEpisodeOfCaresService } from "../../domain/interfaces/episode-of-care.service.interface";
import {
  type TEpisodeOfCareResponse,
  type TPaginatedEpisodeOfCareResponse,
  type TCreateEpisodeOfCare,
  type TUpdateEpisodeOfCareDto,
  type TListEpisodeOfCaresQuery,
} from "@/modules/entities/schemas/episode-of-care";

/**
 * Placeholder implementation — all methods throw until GraphQL is wired.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
export class EpisodeOfCareGraphQLService implements IEpisodeOfCaresService {
  /** @throws Always — not implemented. */
  async create(_dto: TCreateEpisodeOfCare): Promise<TEpisodeOfCareResponse> {
    throw new Error(
      "EpisodeOfCareGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async list(_query?: TListEpisodeOfCaresQuery): Promise<TPaginatedEpisodeOfCareResponse> {
    throw new Error(
      "EpisodeOfCareGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async getById(_id: number): Promise<TEpisodeOfCareResponse> {
    throw new Error(
      "EpisodeOfCareGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async update(_id: number, _dto: TUpdateEpisodeOfCareDto): Promise<TEpisodeOfCareResponse> {
    throw new Error(
      "EpisodeOfCareGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  /** @throws Always — not implemented. */
  async delete(_id: number): Promise<void> {
    throw new Error(
      "EpisodeOfCareGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
