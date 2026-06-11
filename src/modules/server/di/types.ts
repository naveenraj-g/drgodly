import { IOrganizationsService } from "../core/organization/domain/interfaces/organization.service.interface";
import { IPatientsService } from "../core/patient/domain/interfaces/patient.service.interface";
import { ITerminologyService } from "../core/terminology/domain/interfaces/terminology.service.interface";

export const DI_SYMBOLS = {
  IPatientsService: Symbol.for("IPatientsService"),
  IOrganizationsService: Symbol.for("IOrganizationsService"),
  ITerminologyService: Symbol.for("ITerminologyService"),
};

export interface DI_RETURN_TYPES {
  IPatientsService: IPatientsService;
  IOrganizationsService: IOrganizationsService;
  ITerminologyService: ITerminologyService;
}
