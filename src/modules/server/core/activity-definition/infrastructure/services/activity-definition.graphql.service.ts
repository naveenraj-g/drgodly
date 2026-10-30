/**
 * ActivityDefinitionGraphQLService — GraphQL transport stub for IActivityDefinitionsService.
 *
 * Layer: infrastructure / services
 * Resource: ActivityDefinition (FHIR R4)
 * Transport: GraphQL
 *
 * Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the active REST implementation.
 */

import {
  type TCreateActivityDefinition,
  type TPatchActivityDefinitionDto,
  type TListActivityDefinitionsQuery,
  type TActivityDefinitionResponse,
  type TPaginatedActivityDefinitionResponse,
  type TApplyActivityDefinitionDto,
} from "@/modules/entities/schemas/activity-definition";
import { type TApplyDefinitionResponse } from "@/modules/entities/schemas/definition-apply";
import { IActivityDefinitionsService } from "../../domain/interfaces/activity-definition.service.interface";

export class ActivityDefinitionGraphQLService
  implements IActivityDefinitionsService
{
  async create(
    _dto: TCreateActivityDefinition,
  ): Promise<TActivityDefinitionResponse> {
    throw new Error(
      "ActivityDefinitionGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async list(
    _query?: TListActivityDefinitionsQuery,
  ): Promise<TPaginatedActivityDefinitionResponse> {
    throw new Error(
      "ActivityDefinitionGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async getById(_id: number): Promise<TActivityDefinitionResponse> {
    throw new Error(
      "ActivityDefinitionGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async update(
    _id: number,
    _dto: TPatchActivityDefinitionDto,
  ): Promise<TActivityDefinitionResponse> {
    throw new Error(
      "ActivityDefinitionGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async delete(_id: number): Promise<void> {
    throw new Error(
      "ActivityDefinitionGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async apply(
    _id: number,
    _dto: TApplyActivityDefinitionDto,
  ): Promise<TApplyDefinitionResponse> {
    throw new Error(
      "ActivityDefinitionGraphQLService.apply is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
