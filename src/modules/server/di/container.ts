import { createContainer } from "@evyweb/ioctopus";
import { DI_RETURN_TYPES, DI_SYMBOLS } from "./types";
import {
  registerOrganizationModule,
  registerLocationModule,
  registerHealthcareServiceModule,
  registerScheduleModule,
  registerTerminologyModule,
  registerEmrChatModule,
  registerPatientModule,
  registerPractitionerModule,
  registerPractitionerRoleModule,
  registerSlotModule,
  registerAppointmentModule,
  registerIntakeModule,
  registerConsultationModule,
  registerAiConsultationModule,
  registerEncounterModule,
  registerServiceRequestModule,
  registerMedicationRequestModule,
  registerObservationModule,
  registerConditionModule,
  registerDiagnosticReportModule,
  registerDocumentReferenceModule,
  registerStagingMedicalRecordModule,
  registerVitalsModule,
  registerPlanDefinitionModule,
  registerActivityDefinitionModule,
  registerProcedureModule,
  registerTaskModule,
  registerCareTeamModule,
  registerEpisodeOfCareModule,
  registerCarePlanModule,
  registerFlagModule,
  registerQuestionnaireModule,
  registerQuestionnaireResponseModule,
  registerRiskAssessmentModule,
} from "./modules";

const ApplicationContainer = createContainer();

registerOrganizationModule(ApplicationContainer);
registerLocationModule(ApplicationContainer);
registerHealthcareServiceModule(ApplicationContainer);
registerScheduleModule(ApplicationContainer);
registerTerminologyModule(ApplicationContainer);
registerEmrChatModule(ApplicationContainer);
registerPatientModule(ApplicationContainer);
registerPractitionerModule(ApplicationContainer);
registerPractitionerRoleModule(ApplicationContainer);
registerSlotModule(ApplicationContainer);
registerAppointmentModule(ApplicationContainer);
registerIntakeModule(ApplicationContainer);
registerConsultationModule(ApplicationContainer);
registerAiConsultationModule(ApplicationContainer);
registerEncounterModule(ApplicationContainer);
registerServiceRequestModule(ApplicationContainer);
registerMedicationRequestModule(ApplicationContainer);
registerObservationModule(ApplicationContainer);
registerConditionModule(ApplicationContainer);
registerDiagnosticReportModule(ApplicationContainer);
registerDocumentReferenceModule(ApplicationContainer);
registerStagingMedicalRecordModule(ApplicationContainer);
registerVitalsModule(ApplicationContainer);
registerPlanDefinitionModule(ApplicationContainer);
registerActivityDefinitionModule(ApplicationContainer);
registerProcedureModule(ApplicationContainer);
registerTaskModule(ApplicationContainer);
registerCareTeamModule(ApplicationContainer);
registerEpisodeOfCareModule(ApplicationContainer);
registerCarePlanModule(ApplicationContainer);
registerFlagModule(ApplicationContainer);
registerQuestionnaireModule(ApplicationContainer);
registerQuestionnaireResponseModule(ApplicationContainer);
registerRiskAssessmentModule(ApplicationContainer);

export const getInjection = <K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] => {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
};
