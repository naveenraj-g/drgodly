import {
  RegisterPatientValidationSchema,
  TPatientResponse,
} from "@/modules/entities/schemas/patient/patient.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { registerPatientUseCase } from "../../application/usecases/registerPatient.usecase";

function presenter(data: TPatientResponse) {
  return data;
}

export type TRegisterPatientControllerOutput = ReturnType<typeof presenter>;

export async function registerPatientController(
  input: unknown
): Promise<TRegisterPatientControllerOutput> {
  const parsed = await RegisterPatientValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await registerPatientUseCase(parsed.data);
  return presenter(data);
}
