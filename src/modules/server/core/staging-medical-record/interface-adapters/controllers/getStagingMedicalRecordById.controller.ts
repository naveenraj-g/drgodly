/**
 * Get StagingMedicalRecord by id controller.
 * Layer: server / core / staging-medical-record / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdStagingMedicalRecordValidationSchema,
  type TStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";
import { getStagingMedicalRecordByIdUseCase } from "../../application/usecases/getStagingMedicalRecordById.usecase";

function presenter(data: TStagingMedicalRecordResponse) {
  return data;
}
export type TGetStagingMedicalRecordByIdControllerOutput = ReturnType<
  typeof presenter
>;

export async function getStagingMedicalRecordByIdController(
  input: unknown,
): Promise<TGetStagingMedicalRecordByIdControllerOutput> {
  const parsed =
    await GetByIdStagingMedicalRecordValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getStagingMedicalRecordByIdUseCase(parsed.data.id);
  return presenter(data);
}
