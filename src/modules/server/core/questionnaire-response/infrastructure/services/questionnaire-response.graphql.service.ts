/**
 * QuestionnaireResponseGraphQLService — GraphQL transport stub for IQuestionnaireResponsesService.
 *
 * Layer: infrastructure / services
 * Resource: QuestionnaireResponse (FHIR R4)
 * Transport: GraphQL
 *
 * Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the active REST implementation.
 */

import {
  type TCreateQuestionnaireResponse,
  type TUpdateQuestionnaireResponseDto,
  type TListQuestionnaireResponsesQuery,
  type TQuestionnaireResponseResponse,
  type TPaginatedQuestionnaireResponseResponse,
} from "@/modules/entities/schemas/questionnaire-response";
import { IQuestionnaireResponsesService } from "../../domain/interfaces/questionnaire-response.service.interface";

export class QuestionnaireResponseGraphQLService
  implements IQuestionnaireResponsesService
{
  async create(
    _dto: TCreateQuestionnaireResponse,
  ): Promise<TQuestionnaireResponseResponse> {
    throw new Error(
      "QuestionnaireResponseGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async list(
    _query?: TListQuestionnaireResponsesQuery,
  ): Promise<TPaginatedQuestionnaireResponseResponse> {
    throw new Error(
      "QuestionnaireResponseGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async getById(_id: number): Promise<TQuestionnaireResponseResponse> {
    throw new Error(
      "QuestionnaireResponseGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async update(
    _id: number,
    _dto: TUpdateQuestionnaireResponseDto,
  ): Promise<TQuestionnaireResponseResponse> {
    throw new Error(
      "QuestionnaireResponseGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async delete(_id: number): Promise<void> {
    throw new Error(
      "QuestionnaireResponseGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
