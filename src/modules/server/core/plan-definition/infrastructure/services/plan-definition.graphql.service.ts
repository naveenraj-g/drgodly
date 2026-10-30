/**
 * PlanDefinitionGraphQLService — GraphQL transport stub for IPlanDefinitionsService.
 *
 * Layer: infrastructure / services
 * Resource: PlanDefinition (FHIR R4)
 * Transport: GraphQL
 *
 * Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the active REST implementation.
 */

import {
  type TCreatePlanDefinition,
  type TPatchPlanDefinitionDto,
  type TListPlanDefinitionsQuery,
  type TPlanDefinitionResponse,
  type TPaginatedPlanDefinitionResponse,
  type TApplyPlanDefinitionDto,
} from "@/modules/entities/schemas/plan-definition";
import { type TApplyDefinitionResponse } from "@/modules/entities/schemas/definition-apply";
import { IPlanDefinitionsService } from "../../domain/interfaces/plan-definition.service.interface";

export class PlanDefinitionGraphQLService implements IPlanDefinitionsService {
  async create(_dto: TCreatePlanDefinition): Promise<TPlanDefinitionResponse> {
    throw new Error(
      "PlanDefinitionGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async list(_query?: TListPlanDefinitionsQuery): Promise<TPaginatedPlanDefinitionResponse> {
    throw new Error(
      "PlanDefinitionGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async getById(_id: number): Promise<TPlanDefinitionResponse> {
    throw new Error(
      "PlanDefinitionGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async update(_id: number, _dto: TPatchPlanDefinitionDto): Promise<TPlanDefinitionResponse> {
    throw new Error(
      "PlanDefinitionGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async delete(_id: number): Promise<void> {
    throw new Error(
      "PlanDefinitionGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async apply(
    _id: number,
    _dto: TApplyPlanDefinitionDto,
  ): Promise<TApplyDefinitionResponse> {
    throw new Error(
      "PlanDefinitionGraphQLService.apply is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
