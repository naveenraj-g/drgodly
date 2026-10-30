/**
 * Questionnaire DI Module.
 *
 * Layer: server / di / modules / questionnaire
 *
 * Binds IQuestionnairesService to either QuestionnaireRestApiService (default)
 * or QuestionnaireGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { QuestionnaireRestApiService } from "@/modules/server/core/questionnaire/infrastructure/services/questionnaire.rest.service";
import { QuestionnaireGraphQLService } from "@/modules/server/core/questionnaire/infrastructure/services/questionnaire.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerQuestionnaireModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IQuestionnairesService)
    .toClass(
      transport === "graphql"
        ? QuestionnaireGraphQLService
        : QuestionnaireRestApiService,
    );
}
