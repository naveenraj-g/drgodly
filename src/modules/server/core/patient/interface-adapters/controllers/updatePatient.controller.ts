import {
  TPatientResponse,
  UpdatePatientValidationSchema,
} from "@/modules/entities/schemas/patient/patient.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updatePatientUseCase } from "../../application/usecases/updatePatient.usecase";

function presenter(data: TPatientResponse) {
  return data;
}

export type TUpdatePatientControllerOutput = ReturnType<typeof presenter>;

export async function updatePatientController(
  input: unknown
): Promise<TUpdatePatientControllerOutput> {
  const parsed = await UpdatePatientValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updatePatientUseCase(id, dto);
  return presenter(data);
}
