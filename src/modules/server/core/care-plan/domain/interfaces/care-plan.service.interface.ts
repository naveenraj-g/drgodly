/**
 * ICarePlansService domain interface.
 *
 * Layer: domain / interfaces
 * Resource: CarePlan (FHIR R4)
 *
 * Implemented by CarePlanRestApiService (REST) and CarePlanGraphQLService (GraphQL).
 */

import {
  type TCreateCarePlan,
  type TUpdateCarePlanDto,
  type TListCarePlansQuery,
  type TCarePlanResponse,
  type TPaginatedCarePlanResponse,
} from "@/modules/entities/schemas/care-plan";

export interface ICarePlansService {
  /**
   * Creates a new CarePlan.
   *
   * @param dto - CarePlan create payload.
   * @returns Newly created CarePlan response.
   */
  create(dto: TCreateCarePlan): Promise<TCarePlanResponse>;

  /**
   * Returns a paginated list of CarePlans matching query filters.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated CarePlans response.
   */
  list(query?: TListCarePlansQuery): Promise<TPaginatedCarePlanResponse>;

  /**
   * Fetches a CarePlan by numeric ID.
   *
   * @param id - Public numeric ID of the CarePlan.
   * @returns CarePlan record.
   */
  getById(id: number): Promise<TCarePlanResponse>;

  /**
   * Partially updates a CarePlan by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Updated CarePlan record.
   */
  update(id: number, dto: TUpdateCarePlanDto): Promise<TCarePlanResponse>;

  /**
   * Permanently deletes a CarePlan.
   *
   * @param id - Public numeric ID.
   */
  delete(id: number): Promise<void>;
}
