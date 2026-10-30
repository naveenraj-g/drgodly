/**
 * CarePlanGraphQLService — GraphQL transport stub for ICarePlansService.
 *
 * Layer: infrastructure / services
 * Resource: CarePlan (FHIR R4)
 * Transport: GraphQL
 *
 * Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the active REST implementation.
 */

import {
  type TCreateCarePlan,
  type TUpdateCarePlanDto,
  type TListCarePlansQuery,
  type TCarePlanResponse,
  type TPaginatedCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";
import { ICarePlansService } from "../../domain/interfaces/care-plan.service.interface";

export class CarePlanGraphQLService implements ICarePlansService {
  async create(_dto: TCreateCarePlan): Promise<TCarePlanResponse> {
    throw new Error(
      "CarePlanGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async list(_query?: TListCarePlansQuery): Promise<TPaginatedCarePlanResponse> {
    throw new Error(
      "CarePlanGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async getById(_id: number): Promise<TCarePlanResponse> {
    throw new Error(
      "CarePlanGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async update(
    _id: number,
    _dto: TUpdateCarePlanDto,
  ): Promise<TCarePlanResponse> {
    throw new Error(
      "CarePlanGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async delete(_id: number): Promise<void> {
    throw new Error(
      "CarePlanGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
