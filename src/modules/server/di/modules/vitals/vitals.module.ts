/**
 * Vitals DI module — binds IVitalsService to the correct transport implementation.
 *
 * Layer: dependency injection / modules
 * Resource: Vitals (custom, non-FHIR — wearable/manual health and activity metrics)
 *
 * Transport is selected at startup via the FHIR_TRANSPORT environment variable:
 *  - "rest"    (default) → VitalsRestApiService  (fhir-gql REST API)
 *  - "graphql"           → VitalsGraphQLService   (fhir-gql GraphQL API, not yet implemented)
 *
 * Use cases never reference a transport directly — they call
 * getInjection("IVitalsService") and receive whatever is bound here.
 * To switch transports, change FHIR_TRANSPORT and restart; no other file changes.
 */

import { Container } from "@evyweb/ioctopus";
import { VitalsRestApiService } from "@/modules/server/core/vitals/infrastructure/services/vitals.rest.service";
import { VitalsGraphQLService } from "@/modules/server/core/vitals/infrastructure/services/vitals.graphql.service";
import { DI_SYMBOLS } from "../../types";

/** Resolved once at module load — transport cannot change at runtime. */
const transport = process.env.FHIR_TRANSPORT ?? "rest";

/**
 * Registers the Vitals module into the DI container.
 * Binds IVitalsService to REST or GraphQL implementation based on FHIR_TRANSPORT.
 *
 * @param container - The ioctopus application container.
 */
export function registerVitalsModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IVitalsService)
    .toClass(transport === "graphql" ? VitalsGraphQLService : VitalsRestApiService);
}
