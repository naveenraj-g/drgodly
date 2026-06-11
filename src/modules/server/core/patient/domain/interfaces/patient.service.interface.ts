import {
  TListPatientsQuery,
  TPaginatedPatientResponse,
  TPatientResponse,
  TPatientSummary,
  TRegisterPatient,
  TUpdatePatientDto,
} from "@/modules/entities/schemas/patient/patient.schema";

export interface IPatientsService {
  register(dto: TRegisterPatient): Promise<TPatientResponse>;
  list(query?: TListPatientsQuery): Promise<TPaginatedPatientResponse>;
  getMe(): Promise<TPatientResponse>;
  getById(id: number): Promise<TPatientResponse>;
  getSummary(id: number): Promise<TPatientSummary>;
  update(id: number, dto: TUpdatePatientDto): Promise<TPatientResponse>;
  delete(id: number): Promise<void>;
}
