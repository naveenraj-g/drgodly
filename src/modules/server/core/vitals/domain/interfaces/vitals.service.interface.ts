/**
 * IVitalsService — domain interface for Vitals resource operations.
 *
 * Layer: domain / interfaces
 * Resource: Vitals (custom, non-FHIR — wearable/manual health and activity metrics)
 *
 * Defines the contract that VitalsRestApiService / VitalsGraphQLService
 * (infrastructure layer) must satisfy. All use cases depend on this
 * interface rather than the concrete service so the implementation can be
 * swapped or mocked without touching application logic.
 */

import {
  TListVitalsQuery,
  TPaginatedVitalsResponse,
  TVitalsResponse,
  TCreateVitals,
  TPatchVitalsDto,
} from "@/modules/entities/schemas/vitals";

export interface IVitalsService {
  /**
   * Records a new vitals entry via the fhir-gql API.
   * @param dto - Creation payload; every field is optional.
   * @returns The created vitals record.
   * @throws ValidationError | UnauthorizedError | BadGatewayError
   */
  create(dto: TCreateVitals): Promise<TVitalsResponse>;

  /**
   * Returns a paginated list of vitals entries with optional filters.
   * @param query - user_id, patient_id, org_id, date, recorded_at range, limit, offset.
   * @returns Paginated result: { total, limit, offset, data }.
   * @throws UnauthorizedError | BadGatewayError
   */
  list(query?: TListVitalsQuery): Promise<TPaginatedVitalsResponse>;

  /**
   * Fetches a single vitals entry by its public numeric vitals_id.
   * @param id - The fhir-gql public identifier for this vitals entry.
   * @returns The matching vitals record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  getById(id: number): Promise<TVitalsResponse>;

  /**
   * Partially updates a vitals entry (PATCH semantics — metric fields only;
   * user_id/patient_id/org_id/recorded_at are immutable after creation).
   * @param id  - The fhir-gql public identifier.
   * @param dto - Fields to change (at least one must be provided).
   * @returns The updated vitals record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  update(id: number, dto: TPatchVitalsDto): Promise<TVitalsResponse>;

  /**
   * Permanently deletes a vitals entry.
   * @param id - The fhir-gql public identifier.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  delete(id: number): Promise<void>;
}
