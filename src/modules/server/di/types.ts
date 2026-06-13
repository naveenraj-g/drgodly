import { IOrganizationsService } from "../core/organization/domain/interfaces/organization.service.interface";
import { IPatientsService } from "../core/patient/domain/interfaces/patient.service.interface";
import { ITerminologyService } from "../core/terminology/domain/interfaces/terminology.service.interface";
import { IEmrChatRepository } from "../core/emr-chat/domain/interfaces/emr-chat.repository.interface";
import { IPractitionersService } from "../core/practitioner/domain/interfaces/practitioner.service.interface";

export const DI_SYMBOLS = {
  IPatientsService: Symbol.for("IPatientsService"),
  IOrganizationsService: Symbol.for("IOrganizationsService"),
  ITerminologyService: Symbol.for("ITerminologyService"),
  IEmrChatRepository: Symbol.for("IEmrChatRepository"),
  IPractitionersService: Symbol.for("IPractitionersService"),
};

export interface DI_RETURN_TYPES {
  IPatientsService: IPatientsService;
  IOrganizationsService: IOrganizationsService;
  ITerminologyService: ITerminologyService;
  IEmrChatRepository: IEmrChatRepository;
  IPractitionersService: IPractitionersService;
}
