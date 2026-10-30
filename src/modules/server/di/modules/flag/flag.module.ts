/**
 * Flag DI Module.
 *
 * Layer: server / di / modules / flag
 *
 * Binds IFlagsService to either FlagRestApiService (default)
 * or FlagGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { FlagRestApiService } from "@/modules/server/core/flag/infrastructure/services/flag.rest.service";
import { FlagGraphQLService } from "@/modules/server/core/flag/infrastructure/services/flag.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerFlagModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IFlagsService)
    .toClass(transport === "graphql" ? FlagGraphQLService : FlagRestApiService);
}
