import { TPatientResponse } from "@/modules/entities/schemas/patient/patient.schema";
import { getPatientMeUseCase } from "../../application/usecases/getPatientMe.usecase";

function presenter(data: TPatientResponse) {
  return data;
}

export type TGetPatientMeControllerOutput = ReturnType<typeof presenter>;

export async function getPatientMeController(): Promise<TGetPatientMeControllerOutput> {
  const data = await getPatientMeUseCase();
  return presenter(data);
}
