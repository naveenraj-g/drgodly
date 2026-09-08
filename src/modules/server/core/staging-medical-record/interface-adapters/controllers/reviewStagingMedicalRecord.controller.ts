/**
 * Review StagingMedicalRecord controller.
 * Layer: server / core / staging-medical-record / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ReviewStagingMedicalRecordValidationSchema,
  type TStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";
import { reviewStagingMedicalRecordUseCase } from "../../application/usecases/reviewStagingMedicalRecord.usecase";

function presenter(data: TStagingMedicalRecordResponse) {
  return data;
}
export type TReviewStagingMedicalRecordControllerOutput = ReturnType<
  typeof presenter
>;

export async function reviewStagingMedicalRecordController(
  input: unknown,
): Promise<TReviewStagingMedicalRecordControllerOutput> {
  const parsed =
    await ReviewStagingMedicalRecordValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await reviewStagingMedicalRecordUseCase(id, dto);
  return presenter(data);
}
