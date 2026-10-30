/**
 * PlanDefinition DI Module.
 *
 * Layer: server / di / modules / plan-definition
 *
 * Binds IPlanDefinitionsService to either PlanDefinitionRestApiService (default)
 * or PlanDefinitionGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { PlanDefinitionRestApiService } from "@/modules/server/core/plan-definition/infrastructure/services/plan-definition.rest.service";
import { PlanDefinitionGraphQLService } from "@/modules/server/core/plan-definition/infrastructure/services/plan-definition.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerPlanDefinitionModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IPlanDefinitionsService)
    .toClass(
      transport === "graphql"
        ? PlanDefinitionGraphQLService
        : PlanDefinitionRestApiService,
    );
}
