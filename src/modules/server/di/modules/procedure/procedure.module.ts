/**
 * Procedure DI module — binds IProceduresService to the correct transport implementation.
 *
 * Layer: dependency injection / modules
 * Resource: Procedure (FHIR R4)
 *
 * Transport is selected at startup via the FHIR_TRANSPORT environment variable:
 *  - "rest"    (default) → ProcedureRestApiService  (fhir-gql REST API)
 *  - "graphql"           → ProcedureGraphQLService   (fhir-gql GraphQL API, not yet implemented)
 *
 * Use cases never reference a transport directly — they call
 * getInjection("IProceduresService") and receive whatever is bound here.
 * To switch transports, change FHIR_TRANSPORT and restart; no other file changes.
 */

import { Container } from "@evyweb/ioctopus";
import { ProcedureRestApiService } from "@/modules/server/core/procedure/infrastructure/services/procedure.rest.service";
import { ProcedureGraphQLService } from "@/modules/server/core/procedure/infrastructure/services/procedure.graphql.service";
import { DI_SYMBOLS } from "../../types";

/** Resolved once at module load — transport cannot change at runtime. */
const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers the Procedure module into the DI container.
 * Binds IProceduresService to REST or GraphQL implementation based on FHIR_TRANSPORT.
 *
 * @param container - The ioctopus application container.
 */
export function registerProcedureModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IProceduresService)
    .toClass(transport === "graphql" ? ProcedureGraphQLService : ProcedureRestApiService);
}
