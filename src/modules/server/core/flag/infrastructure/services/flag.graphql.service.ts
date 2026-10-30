/**
 * FlagGraphQLService — GraphQL transport stub for IFlagsService.
 *
 * Layer: infrastructure / services
 * Resource: Flag (FHIR R4)
 * Transport: GraphQL
 *
 * Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the active REST implementation.
 */

import {
  type TCreateFlag,
  type TUpdateFlagDto,
  type TListFlagsQuery,
  type TFlagResponse,
  type TPaginatedFlagResponse,
} from "@/modules/entities/schemas/flag";
import { IFlagsService } from "../../domain/interfaces/flag.service.interface";

export class FlagGraphQLService implements IFlagsService {
  async create(_dto: TCreateFlag): Promise<TFlagResponse> {
    throw new Error(
      "FlagGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async list(_query?: TListFlagsQuery): Promise<TPaginatedFlagResponse> {
    throw new Error(
      "FlagGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async getById(_id: number): Promise<TFlagResponse> {
    throw new Error(
      "FlagGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async update(
    _id: number,
    _dto: TUpdateFlagDto,
  ): Promise<TFlagResponse> {
    throw new Error(
      "FlagGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async delete(_id: number): Promise<void> {
    throw new Error(
      "FlagGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
