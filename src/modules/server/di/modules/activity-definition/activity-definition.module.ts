/**
 * ActivityDefinition DI Module.
 *
 * Layer: server / di / modules / activity-definition
 *
 * Binds IActivityDefinitionsService to either ActivityDefinitionRestApiService (default)
 * or ActivityDefinitionGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { ActivityDefinitionRestApiService } from "@/modules/server/core/activity-definition/infrastructure/services/activity-definition.rest.service";
import { ActivityDefinitionGraphQLService } from "@/modules/server/core/activity-definition/infrastructure/services/activity-definition.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerActivityDefinitionModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IActivityDefinitionsService)
    .toClass(
      transport === "graphql"
        ? ActivityDefinitionGraphQLService
        : ActivityDefinitionRestApiService,
    );
}
