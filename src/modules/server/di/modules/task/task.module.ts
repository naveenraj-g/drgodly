/**
 * Task DI module — binds ITaskService to the correct transport implementation.
 *
 * Layer: dependency injection / modules
 * Resource: Task (FHIR R4)
 *
 * Transport is selected at startup via the FHIR_TRANSPORT environment variable:
 *  - "rest"    (default) → TaskRestApiService
 *  - "graphql"           → TaskGraphQLService
 */

import { Container } from "@evyweb/ioctopus";
import { TaskRestApiService } from "@/modules/server/core/task/infrastructure/services/task.rest.service";
import { TaskGraphQLService } from "@/modules/server/core/task/infrastructure/services/task.graphql.service";
import { DI_SYMBOLS } from "../../types";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerTaskModule(container: Container) {
  container
    .bind(DI_SYMBOLS.ITaskService)
    .toClass(transport === "graphql" ? TaskGraphQLService : TaskRestApiService);
}
