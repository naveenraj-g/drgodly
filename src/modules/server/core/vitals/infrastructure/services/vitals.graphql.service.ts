/**
 * VitalsGraphQLService — GraphQL transport stub for IVitalsService.
 *
 * Layer: infrastructure / services
 * Resource: Vitals (custom, non-FHIR — wearable/manual health and activity metrics)
 * Transport: GraphQL (not yet implemented)
 *
 * fhir-gql's GraphQL surface does not yet expose Vitals mutations/queries.
 * This stub exists so the DI container can bind a transport based on
 * FHIR_TRANSPORT without a compile error, and fails loudly if selected.
 */

import {
  TListVitalsQuery,
  TPaginatedVitalsResponse,
  TVitalsResponse,
  TCreateVitals,
  TPatchVitalsDto,
} from "@/modules/entities/schemas/vitals";
import { IVitalsService } from "../../domain/interfaces/vitals.service.interface";

export class VitalsGraphQLService implements IVitalsService {
  create(_dto: TCreateVitals): Promise<TVitalsResponse> {
    throw new Error("VitalsGraphQLService.create is not implemented yet");
  }

  list(_query?: TListVitalsQuery): Promise<TPaginatedVitalsResponse> {
    throw new Error("VitalsGraphQLService.list is not implemented yet");
  }

  getById(_id: number): Promise<TVitalsResponse> {
    throw new Error("VitalsGraphQLService.getById is not implemented yet");
  }

  update(_id: number, _dto: TPatchVitalsDto): Promise<TVitalsResponse> {
    throw new Error("VitalsGraphQLService.update is not implemented yet");
  }

  delete(_id: number): Promise<void> {
    throw new Error("VitalsGraphQLService.delete is not implemented yet");
  }
}
