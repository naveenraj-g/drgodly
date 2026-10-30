/**
 * EpisodeOfCare DI Module.
 *
 * Layer: server / di / modules / episode-of-care
 *
 * Binds IEpisodeOfCaresService to either EpisodeOfCareRestApiService (default)
 * or EpisodeOfCareGraphQLService based on the FHIR_TRANSPORT environment variable.
 */

import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { EpisodeOfCareRestApiService } from "@/modules/server/core/episode-of-care/infrastructure/services/episode-of-care.rest.service";
import { EpisodeOfCareGraphQLService } from "@/modules/server/core/episode-of-care/infrastructure/services/episode-of-care.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerEpisodeOfCareModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IEpisodeOfCaresService)
    .toClass(
      transport === "graphql"
        ? EpisodeOfCareGraphQLService
        : EpisodeOfCareRestApiService,
    );
}
