import { IOrganizationsService } from "../core/organization/domain/interfaces/organization.service.interface";
import { ILocationsService } from "../core/location/domain/interfaces/location.service.interface";
import { IHealthcareServicesService } from "../core/healthcare-service/domain/interfaces/healthcare-service.service.interface";
import { ISchedulesService } from "../core/schedule/domain/interfaces/schedule.service.interface";
import { IPatientsService } from "../core/patient/domain/interfaces/patient.service.interface";
import { ITerminologyService } from "../core/terminology/domain/interfaces/terminology.service.interface";
import { IEmrChatRepository } from "../core/emr-chat/domain/interfaces/emr-chat.repository.interface";
import { IPractitionersService } from "../core/practitioner/domain/interfaces/practitioner.service.interface";
import { IPractitionerRolesService } from "../core/practitioner-role/domain/interfaces/practitioner-role.service.interface";
import { ISlotService } from "../core/slot/domain/interfaces/slot.service.interface";
import { IAppointmentService } from "../core/appointment/domain/interfaces/appointment.service.interface";
import { IIntakeRepository } from "../core/intake/domain/interfaces/intake.repository.interface";
import { IConsultationRepository } from "../core/consultation/domain/interfaces/consultation.repository.interface";
import { IAiConsultationRepository } from "../core/ai-consultation/domain/interfaces/ai-consultation.repository.interface";
import { IEncounterService } from "../core/encounter/domain/interfaces/encounter.service.interface";
import { IServiceRequestService } from "../core/service-request/domain/interfaces/service-request.service.interface";
import { IMedicationRequestService } from "../core/medication-request/domain/interfaces/medication-request.service.interface";
import { IObservationService } from "../core/observation/domain/interfaces/observation.service.interface";
import { IConditionService } from "../core/condition/domain/interfaces/condition.service.interface";
import { IDiagnosticReportService } from "../core/diagnostic-report/domain/interfaces/diagnostic-report.service.interface";
import { IDocumentReferenceService } from "../core/document-reference/domain/interfaces/document-reference.service.interface";
import { IStagingMedicalRecordsService } from "../core/staging-medical-record/domain/interfaces/staging-medical-record.service.interface";
import { IVitalsService } from "../core/vitals/domain/interfaces/vitals.service.interface";
import { IPlanDefinitionsService } from "../core/plan-definition/domain/interfaces/plan-definition.service.interface";
import { IActivityDefinitionsService } from "../core/activity-definition/domain/interfaces/activity-definition.service.interface";
import { IProceduresService } from "../core/procedure/domain/interfaces/procedure.service.interface";
import { ITaskService } from "../core/task/domain/interfaces/task.service.interface";
import { ICareTeamsService } from "../core/care-team/domain/interfaces/care-team.service.interface";
import { IEpisodeOfCaresService } from "../core/episode-of-care/domain/interfaces/episode-of-care.service.interface";
import { ICarePlansService } from "../core/care-plan/domain/interfaces/care-plan.service.interface";
import { IFlagsService } from "../core/flag/domain/interfaces/flag.service.interface";
import { IQuestionnairesService } from "../core/questionnaire/domain/interfaces/questionnaire.service.interface";
import { IQuestionnaireResponsesService } from "../core/questionnaire-response/domain/interfaces/questionnaire-response.service.interface";
import { IRiskAssessmentsService } from "../core/risk-assessment/domain/interfaces/risk-assessment.service.interface";

export const DI_SYMBOLS = {
  IPatientsService: Symbol.for("IPatientsService"),
  IOrganizationsService: Symbol.for("IOrganizationsService"),
  ILocationsService: Symbol.for("ILocationsService"),
  IHealthcareServicesService: Symbol.for("IHealthcareServicesService"),
  ISchedulesService: Symbol.for("ISchedulesService"),
  ITerminologyService: Symbol.for("ITerminologyService"),
  IEmrChatRepository: Symbol.for("IEmrChatRepository"),
  IPractitionersService: Symbol.for("IPractitionersService"),
  IPractitionerRolesService: Symbol.for("IPractitionerRolesService"),
  ISlotService: Symbol.for("ISlotService"),
  IAppointmentService: Symbol.for("IAppointmentService"),
  IIntakeRepository: Symbol.for("IIntakeRepository"),
  IConsultationRepository: Symbol.for("IConsultationRepository"),
  IAiConsultationRepository: Symbol.for("IAiConsultationRepository"),
  IEncounterService: Symbol.for("IEncounterService"),
  IServiceRequestService: Symbol.for("IServiceRequestService"),
  IMedicationRequestService: Symbol.for("IMedicationRequestService"),
  IObservationService: Symbol.for("IObservationService"),
  IConditionService: Symbol.for("IConditionService"),
  IDiagnosticReportService: Symbol.for("IDiagnosticReportService"),
  IDocumentReferenceService: Symbol.for("IDocumentReferenceService"),
  IStagingMedicalRecordsService: Symbol.for("IStagingMedicalRecordsService"),
  IVitalsService: Symbol.for("IVitalsService"),
  IPlanDefinitionsService: Symbol.for("IPlanDefinitionsService"),
  IActivityDefinitionsService: Symbol.for("IActivityDefinitionsService"),
  IProceduresService: Symbol.for("IProceduresService"),
  ITaskService: Symbol.for("ITaskService"),
  ICareTeamsService: Symbol.for("ICareTeamsService"),
  IEpisodeOfCaresService: Symbol.for("IEpisodeOfCaresService"),
  ICarePlansService: Symbol.for("ICarePlansService"),
  IFlagsService: Symbol.for("IFlagsService"),
  IQuestionnairesService: Symbol.for("IQuestionnairesService"),
  IQuestionnaireResponsesService: Symbol.for("IQuestionnaireResponsesService"),
  IRiskAssessmentsService: Symbol.for("IRiskAssessmentsService"),
};

export interface DI_RETURN_TYPES {
  IPatientsService: IPatientsService;
  IOrganizationsService: IOrganizationsService;
  ILocationsService: ILocationsService;
  IHealthcareServicesService: IHealthcareServicesService;
  ISchedulesService: ISchedulesService;
  ITerminologyService: ITerminologyService;
  IEmrChatRepository: IEmrChatRepository;
  IPractitionersService: IPractitionersService;
  IPractitionerRolesService: IPractitionerRolesService;
  ISlotService: ISlotService;
  IAppointmentService: IAppointmentService;
  IIntakeRepository: IIntakeRepository;
  IConsultationRepository: IConsultationRepository;
  IAiConsultationRepository: IAiConsultationRepository;
  IEncounterService: IEncounterService;
  IServiceRequestService: IServiceRequestService;
  IMedicationRequestService: IMedicationRequestService;
  IObservationService: IObservationService;
  IConditionService: IConditionService;
  IDiagnosticReportService: IDiagnosticReportService;
  IDocumentReferenceService: IDocumentReferenceService;
  IStagingMedicalRecordsService: IStagingMedicalRecordsService;
  IVitalsService: IVitalsService;
  IPlanDefinitionsService: IPlanDefinitionsService;
  IActivityDefinitionsService: IActivityDefinitionsService;
  IProceduresService: IProceduresService;
  ITaskService: ITaskService;
  ICareTeamsService: ICareTeamsService;
  IEpisodeOfCaresService: IEpisodeOfCaresService;
  ICarePlansService: ICarePlansService;
  IFlagsService: IFlagsService;
  IQuestionnairesService: IQuestionnairesService;
  IQuestionnaireResponsesService: IQuestionnaireResponsesService;
  IRiskAssessmentsService: IRiskAssessmentsService;
}
