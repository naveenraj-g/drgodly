/**
 * QuestionnaireGraphQLService — GraphQL transport stub for IQuestionnairesService.
 *
 * Layer: infrastructure / services
 * Resource: Questionnaire (FHIR R4)
 * Transport: GraphQL
 *
 * Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the active REST implementation.
 */

import {
  type TCreateQuestionnaire,
  type TUpdateQuestionnaireDto,
  type TListQuestionnairesQuery,
  type TQuestionnaireResponse,
  type TPaginatedQuestionnaireResponse,
} from "@/modules/entities/schemas/questionnaire";
import { IQuestionnairesService } from "../../domain/interfaces/questionnaire.service.interface";

export class QuestionnaireGraphQLService implements IQuestionnairesService {
  async create(_dto: TCreateQuestionnaire): Promise<TQuestionnaireResponse> {
    throw new Error(
      "QuestionnaireGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async list(
    _query?: TListQuestionnairesQuery,
  ): Promise<TPaginatedQuestionnaireResponse> {
    throw new Error(
      "QuestionnaireGraphQLService.list is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async getById(_id: number): Promise<TQuestionnaireResponse> {
    throw new Error(
      "QuestionnaireGraphQLService.getById is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async update(
    _id: number,
    _dto: TUpdateQuestionnaireDto,
  ): Promise<TQuestionnaireResponse> {
    throw new Error(
      "QuestionnaireGraphQLService.update is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }

  async delete(_id: number): Promise<void> {
    throw new Error(
      "QuestionnaireGraphQLService.delete is not yet implemented. Set FHIR_TRANSPORT=rest.",
    );
  }
}
