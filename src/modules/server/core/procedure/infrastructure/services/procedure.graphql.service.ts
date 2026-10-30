/**
 * ProcedureGraphQLService — GraphQL transport stub for IProceduresService.
 *
 * Layer: infrastructure / services
 * Resource: Procedure (FHIR R4)
 * Transport: GraphQL (not yet implemented)
 *
 * fhir-gql's GraphQL surface does not yet expose Procedure mutations/queries.
 * This stub exists so the DI container can bind a transport based on
 * FHIR_TRANSPORT without a compile error, and fails loudly if selected.
 */

import {
  TListProceduresQuery,
  TPaginatedProcedureResponse,
  TProcedureResponse,
  TCreateProcedure,
  TUpdateProcedureDto,
} from "@/modules/entities/schemas/procedure";
import { IProceduresService } from "../../domain/interfaces/procedure.service.interface";

export class ProcedureGraphQLService implements IProceduresService {
  create(_dto: TCreateProcedure): Promise<TProcedureResponse> {
    throw new Error("ProcedureGraphQLService.create is not implemented yet");
  }

  list(_query?: TListProceduresQuery): Promise<TPaginatedProcedureResponse> {
    throw new Error("ProcedureGraphQLService.list is not implemented yet");
  }

  getById(_id: number): Promise<TProcedureResponse> {
    throw new Error("ProcedureGraphQLService.getById is not implemented yet");
  }

  update(_id: number, _dto: TUpdateProcedureDto): Promise<TProcedureResponse> {
    throw new Error("ProcedureGraphQLService.update is not implemented yet");
  }

  delete(_id: number): Promise<void> {
    throw new Error("ProcedureGraphQLService.delete is not implemented yet");
  }
}
