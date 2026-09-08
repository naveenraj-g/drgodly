/**
 * List StagingMedicalRecords controller.
 * Layer: server / core / staging-medical-record / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListStagingMedicalRecordsValidationSchema,
  type TPaginatedStagingMedicalRecordResponse,
} from "@/modules/entities/schemas/staging-medical-record";
import { listStagingMedicalRecordsUseCase } from "../../application/usecases/listStagingMedicalRecords.usecase";

function presenter(data: TPaginatedStagingMedicalRecordResponse) {
  return data;
}
export type TListStagingMedicalRecordsControllerOutput = ReturnType<
  typeof presenter
>;

export async function listStagingMedicalRecordsController(
  input: unknown,
): Promise<TListStagingMedicalRecordsControllerOutput> {
  const parsed =
    await ListStagingMedicalRecordsValidationSchema.optional().safeParseAsync(
      input,
    );
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listStagingMedicalRecordsUseCase(parsed.data);
  return presenter(data);
}
