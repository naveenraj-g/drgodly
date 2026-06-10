import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { PatientService } from "@/modules/server/core/patient/infrastructure/services/patient.service";

export function registerPatientModule(container: Container) {
  container.bind(DI_SYMBOLS.IPatientService).toClass(PatientService);
}
