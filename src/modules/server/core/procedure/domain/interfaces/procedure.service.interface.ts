/**
 * Procedure service domain interface.
 *
 * Layer: server / core / procedure / domain
 */

import type {
  TCreateProcedure,
  TUpdateProcedureDto,
  TListProceduresQuery,
  TProcedureResponse,
  TPaginatedProcedureResponse,
} from "@/modules/entities/schemas/procedure";

/**
 * Service contract for Procedure CRUD operations.
 * Injected via IoC as `IProceduresService`.
 */
export interface IProceduresService {
  /**
   * Creates a new Procedure.
   * @param dto - `status` and `subject` are required; everything else optional.
   */
  create(dto: TCreateProcedure): Promise<TProcedureResponse>;

  /**
   * Returns a paginated list of Procedures with optional filters.
   * @param query - Filters (status, code, patient, encounter, performer, limit, offset).
   */
  list(query?: TListProceduresQuery): Promise<TPaginatedProcedureResponse>;

  /**
   * Fetches a single Procedure by its integer ID.
   * @param id - fhir-gql database ID.
   */
  getById(id: number): Promise<TProcedureResponse>;

  /**
   * Partially updates scalar/reference fields and child arrays (REPLACE
   * semantics) on an existing Procedure.
   * @param id - fhir-gql database ID.
   * @param dto - Patch payload.
   */
  update(id: number, dto: TUpdateProcedureDto): Promise<TProcedureResponse>;

  /**
   * Permanently deletes a Procedure and all its child records (cascade).
   * @param id - fhir-gql database ID.
   */
  delete(id: number): Promise<void>;
}
