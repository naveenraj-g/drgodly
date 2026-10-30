/**
 * QuestionnaireResponse DI Module.
 *
 * Layer: server / di / modules / questionnaire-response
 *
 * Binds IQuestionnaireResponsesService to either QuestionnaireResponseRestApiService (default)
 * or QuestionnaireResponseGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { QuestionnaireResponseRestApiService } from "@/modules/server/core/questionnaire-response/infrastructure/services/questionnaire-response.rest.service";
import { QuestionnaireResponseGraphQLService } from "@/modules/server/core/questionnaire-response/infrastructure/services/questionnaire-response.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerQuestionnaireResponseModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IQuestionnaireResponsesService)
    .toClass(
      transport === "graphql"
        ? QuestionnaireResponseGraphQLService
        : QuestionnaireResponseRestApiService,
    );
}
