/**
 * RiskAssessment DI Module.
 *
 * Layer: server / di / modules / risk-assessment
 *
 * Binds IRiskAssessmentsService to either RiskAssessmentRestApiService (default)
 * or RiskAssessmentGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { RiskAssessmentRestApiService } from "@/modules/server/core/risk-assessment/infrastructure/services/risk-assessment.rest.service";
import { RiskAssessmentGraphQLService } from "@/modules/server/core/risk-assessment/infrastructure/services/risk-assessment.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerRiskAssessmentModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IRiskAssessmentsService)
    .toClass(
      transport === "graphql"
        ? RiskAssessmentGraphQLService
        : RiskAssessmentRestApiService,
    );
}
