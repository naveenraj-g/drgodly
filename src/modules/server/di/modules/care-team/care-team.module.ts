/**
 * CareTeam DI Module.
 *
 * Layer: server / di / modules / care-team
 *
 * Binds ICareTeamsService to either CareTeamRestApiService (default)
 * or CareTeamGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { CareTeamRestApiService } from "@/modules/server/core/care-team/infrastructure/services/care-team.rest.service";
import { CareTeamGraphQLService } from "@/modules/server/core/care-team/infrastructure/services/care-team.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerCareTeamModule(container: Container) {
  container
    .bind(DI_SYMBOLS.ICareTeamsService)
    .toClass(
      transport === "graphql" ? CareTeamGraphQLService : CareTeamRestApiService,
    );
}
