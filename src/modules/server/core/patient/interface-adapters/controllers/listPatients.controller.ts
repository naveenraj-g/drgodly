import {
  ListPatientsValidationSchema,
  TPaginatedPatientResponse,
} from "@/modules/entities/schemas/patient/patient.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listPatientsUseCase } from "../../application/usecases/listPatients.usecase";

function presenter(data: TPaginatedPatientResponse) {
  return data;
}

export type TListPatientsControllerOutput = ReturnType<typeof presenter>;

export async function listPatientsController(
  input?: unknown
): Promise<TListPatientsControllerOutput> {
  if (input === undefined || input === null) {
    const data = await listPatientsUseCase();
    return presenter(data);
  }
  const parsed = await ListPatientsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPatientsUseCase(parsed.data);
  return presenter(data);
}
