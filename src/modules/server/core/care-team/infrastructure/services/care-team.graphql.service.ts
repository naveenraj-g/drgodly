/**
 * CareTeamGraphQLService — GraphQL transport stub for ICareTeamsService.
 *
 * Layer: infrastructure / services
 * Resource: CareTeam (FHIR R4)
 * Transport: GraphQL
 *
 * Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the active REST implementation.
 */

import {
  type TCreateCareTeam,
  type TUpdateCareTeamDto,
  type TListCareTeamsQuery,
  type TCareTeamResponse,
  type TPaginatedCareTeamResponse,
} from "@/modules/entities/schemas/care-team";
import { ICareTeamsService } from "../../domain/interfaces/care-team.service.interface";

export class CareTeamGraphQLService implements ICareTeamsService {
  async create(_dto: TCreateCareTeam): Promise<TCareTeamResponse> {
    throw new Error(
      "CareTeamGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async list(_query?: TListCareTeamsQuery): Promise<TPaginatedCareTeamResponse> {
    throw new Error(
      "CareTeamGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async getById(_id: number): Promise<TCareTeamResponse> {
    throw new Error(
      "CareTeamGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async update(
    _id: number,
    _dto: TUpdateCareTeamDto,
  ): Promise<TCareTeamResponse> {
    throw new Error(
      "CareTeamGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async delete(_id: number): Promise<void> {
    throw new Error(
      "CareTeamGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
