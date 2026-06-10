import {
  GetPatientSummaryValidationSchema,
  TPatientSummary,
} from "@/modules/entities/schemas/patient/patient.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getPatientSummaryUseCase } from "../../application/usecases/getPatientSummary.usecase";

function presenter(data: TPatientSummary) {
  return data;
}

export type TGetPatientSummaryControllerOutput = ReturnType<typeof presenter>;

export async function getPatientSummaryController(
  input: unknown
): Promise<TGetPatientSummaryControllerOutput> {
  const parsed = await GetPatientSummaryValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getPatientSummaryUseCase(parsed.data.id);
  return presenter(data);
}
