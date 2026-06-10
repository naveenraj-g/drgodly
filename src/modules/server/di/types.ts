import { IPatientService } from "../core/patient/domain/interfaces/patient.service.interface";

export const DI_SYMBOLS = {
  IPatientService: Symbol.for("IPatientService"),
};

export interface DI_RETURN_TYPES {
  IPatientService: IPatientService;
}
