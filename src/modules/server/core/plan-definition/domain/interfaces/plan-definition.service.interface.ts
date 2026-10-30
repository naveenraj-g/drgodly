/**
 * IPlanDefinitionsService domain interface.
 *
 * Layer: domain / interfaces
 * Resource: PlanDefinition (FHIR R4)
 *
 * Implemented by PlanDefinitionRestApiService (REST) and PlanDefinitionGraphQLService (GraphQL).
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

export interface IPlanDefinitionsService {
  /**
   * Creates a new PlanDefinition.
   *
   * @param dto - PlanDefinition create data.
   * @returns Newly created PlanDefinition response.
   */
  create(dto: TCreatePlanDefinition): Promise<TPlanDefinitionResponse>;

  /**
   * Returns a paginated list of PlanDefinitions matching the query filters.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated PlanDefinitions response.
   */
  list(query?: TListPlanDefinitionsQuery): Promise<TPaginatedPlanDefinitionResponse>;

  /**
   * Fetches a PlanDefinition by its numeric public ID.
   *
   * @param id - Public numeric ID of the PlanDefinition.
   * @returns PlanDefinition record.
   */
  getById(id: number): Promise<TPlanDefinitionResponse>;

  /**
   * Partially updates a PlanDefinition by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Updated PlanDefinition record.
   */
  update(id: number, dto: TPatchPlanDefinitionDto): Promise<TPlanDefinitionResponse>;

  /**
   * Permanently deletes a PlanDefinition.
   *
   * @param id - Public numeric ID.
   */
  delete(id: number): Promise<void>;

  /**
   * Applies the PlanDefinition to a subject (FHIR `$apply`) — generates ServiceRequests.
   * With `persist=false` (default) this is a preview and nothing is saved.
   *
   * @param id  - Public numeric ID of the PlanDefinition.
   * @param dto - Apply body (subject, encounter, practitioner, persist, ...).
   * @returns Generated ServiceRequests plus the actions that were skipped.
   */
  apply(id: number, dto: TApplyPlanDefinitionDto): Promise<TApplyDefinitionResponse>;
}
