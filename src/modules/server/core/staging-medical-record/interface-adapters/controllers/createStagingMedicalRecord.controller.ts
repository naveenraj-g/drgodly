/**
 * Create StagingMedicalRecord controller.
 * Layer: server / core / staging-medical-record / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateStagingMedicalRecordValidationSchema,
  type TStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";
import { createStagingMedicalRecordUseCase } from "../../application/usecases/createStagingMedicalRecord.usecase";

function presenter(data: TStagingMedicalRecordResponse) {
  return data;
}
export type TCreateStagingMedicalRecordControllerOutput = ReturnType<
  typeof presenter
>;

export async function createStagingMedicalRecordController(
  input: unknown,
): Promise<TCreateStagingMedicalRecordControllerOutput> {
  const parsed =
    await CreateStagingMedicalRecordValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createStagingMedicalRecordUseCase(parsed.data);
  return presenter(data);
}
