/**
 * Update StagingMedicalRecord controller.
 * Layer: server / core / staging-medical-record / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateStagingMedicalRecordValidationSchema,
  type TStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";
import { updateStagingMedicalRecordUseCase } from "../../application/usecases/updateStagingMedicalRecord.usecase";

function presenter(data: TStagingMedicalRecordResponse) {
  return data;
}
export type TUpdateStagingMedicalRecordControllerOutput = ReturnType<
  typeof presenter
>;

export async function updateStagingMedicalRecordController(
  input: unknown,
): Promise<TUpdateStagingMedicalRecordControllerOutput> {
  const parsed =
    await UpdateStagingMedicalRecordValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateStagingMedicalRecordUseCase(id, dto);
  return presenter(data);
}
