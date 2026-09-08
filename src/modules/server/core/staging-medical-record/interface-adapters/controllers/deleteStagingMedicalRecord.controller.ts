/**
 * Delete StagingMedicalRecord controller.
 * Layer: server / core / staging-medical-record / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteStagingMedicalRecordValidationSchema } from "@/modules/entities/schemas/staging-medical-record";
import { deleteStagingMedicalRecordUseCase } from "../../application/usecases/deleteStagingMedicalRecord.usecase";

export async function deleteStagingMedicalRecordController(
  input: unknown,
): Promise<void> {
  const parsed =
    await DeleteStagingMedicalRecordValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteStagingMedicalRecordUseCase(parsed.data.id);
}
