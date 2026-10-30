/**
 * CarePlan DI Module.
 *
 * Layer: server / di / modules / care-plan
 *
 * Binds ICarePlansService to either CarePlanRestApiService (default)
 * or CarePlanGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { CarePlanRestApiService } from "@/modules/server/core/care-plan/infrastructure/services/care-plan.rest.service";
import { CarePlanGraphQLService } from "@/modules/server/core/care-plan/infrastructure/services/care-plan.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerCarePlanModule(container: Container) {
  container
    .bind(DI_SYMBOLS.ICarePlansService)
    .toClass(
      transport === "graphql" ? CarePlanGraphQLService : CarePlanRestApiService,
    );
}
