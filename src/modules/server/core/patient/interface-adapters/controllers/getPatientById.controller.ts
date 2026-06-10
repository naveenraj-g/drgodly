import {
  GetPatientByIdValidationSchema,
  TPatientResponse,
} from "@/modules/entities/schemas/patient/patient.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getPatientByIdUseCase } from "../../application/usecases/getPatientById.usecase";

function presenter(data: TPatientResponse) {
  return data;
}

export type TGetPatientByIdControllerOutput = ReturnType<typeof presenter>;

export async function getPatientByIdController(
  input: unknown
): Promise<TGetPatientByIdControllerOutput> {
  const parsed = await GetPatientByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getPatientByIdUseCase(parsed.data.id);
  return presenter(data);
}
