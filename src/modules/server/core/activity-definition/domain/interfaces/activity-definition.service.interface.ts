/**
 * IActivityDefinitionsService domain interface.
 *
 * Layer: domain / interfaces
 * Resource: ActivityDefinition (FHIR R4)
 *
 * Implemented by ActivityDefinitionRestApiService (REST) and ActivityDefinitionGraphQLService (GraphQL).
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

export interface IActivityDefinitionsService {
  /**
   * Creates a new ActivityDefinition.
   *
   * @param dto - ActivityDefinition create payload.
   * @returns Newly created ActivityDefinition response.
   */
  create(dto: TCreateActivityDefinition): Promise<TActivityDefinitionResponse>;

  /**
   * Returns a paginated list of ActivityDefinitions matching the search query.
   *
   * @param query - Optional search/filter parameters.
   * @returns Paginated ActivityDefinitions response.
   */
  list(
    query?: TListActivityDefinitionsQuery,
  ): Promise<TPaginatedActivityDefinitionResponse>;

  /**
   * Fetches an ActivityDefinition by its numeric public ID.
   *
   * @param id - Public numeric ID of the ActivityDefinition.
   * @returns ActivityDefinition record.
   */
  getById(id: number): Promise<TActivityDefinitionResponse>;

  /**
   * Partially updates an ActivityDefinition by ID.
   *
   * @param id - Public numeric ID.
   * @param dto - Patch fields.
   * @returns Updated ActivityDefinition record.
   */
  update(
    id: number,
    dto: TPatchActivityDefinitionDto,
  ): Promise<TActivityDefinitionResponse>;

  /**
   * Permanently deletes an ActivityDefinition.
   *
   * @param id - Public numeric ID.
   */
  delete(id: number): Promise<void>;

  /**
   * Applies the ActivityDefinition to a subject (FHIR `$apply`) — generates ServiceRequests.
   * With `persist=false` (default) this is a preview and nothing is saved.
   *
   * @param id  - Public numeric ID of the ActivityDefinition.
   * @param dto - Apply body (subject, encounter, practitioner, persist, ...).
   * @returns Generated ServiceRequests plus the actions that were skipped.
   */
  apply(id: number, dto: TApplyActivityDefinitionDto): Promise<TApplyDefinitionResponse>;
}
