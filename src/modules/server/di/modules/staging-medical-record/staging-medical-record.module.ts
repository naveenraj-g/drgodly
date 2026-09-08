/**
 * StagingMedicalRecord DI module.
 * Layer: server / di / modules / staging-medical-record
 * Binds IStagingMedicalRecordsService to the REST implementation (default) or
 * GraphQL stub when FHIR_TRANSPORT=graphql.
 */
import { type Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { StagingMedicalRecordRestApiService } from "@/modules/server/core/staging-medical-record/infrastructure/services/staging-medical-record.rest.service";
import { StagingMedicalRecordGraphQLService } from "@/modules/server/core/staging-medical-record/infrastructure/services/staging-medical-record.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function registerStagingMedicalRecordModule(container: Container): void {
  container
    .bind(DI_SYMBOLS.IStagingMedicalRecordsService)
    .toClass(
      transport === "graphql"
        ? StagingMedicalRecordGraphQLService
        : StagingMedicalRecordRestApiService,
    );
}
