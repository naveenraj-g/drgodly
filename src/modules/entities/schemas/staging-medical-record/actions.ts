/**
 * StagingMedicalRecord ZSA server action input schemas.
 *
 * Layer: entities / schemas / staging-medical-record
 *
 * Mutating actions (create/update/review/delete) include transportOptions for
 * revalidation after the action completes; reads do not.
 */
import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateStagingMedicalRecordValidationSchema,
  UpdateStagingMedicalRecordValidationSchema,
  ReviewStagingMedicalRecordValidationSchema,
  ListStagingMedicalRecordsValidationSchema,
  GetByIdStagingMedicalRecordValidationSchema,
  DeleteStagingMedicalRecordValidationSchema,
} from "./input";

export const CreateStagingMedicalRecordActionSchema = z.object({
  payload: CreateStagingMedicalRecordValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateStagingMedicalRecordAction = z.infer<
  typeof CreateStagingMedicalRecordActionSchema
>;

export const ListStagingMedicalRecordsActionSchema = z.object({
  payload: ListStagingMedicalRecordsValidationSchema.optional(),
});
export type TListStagingMedicalRecordsAction = z.infer<
  typeof ListStagingMedicalRecordsActionSchema
>;

export const GetStagingMedicalRecordByIdActionSchema = z.object({
  payload: GetByIdStagingMedicalRecordValidationSchema,
});
export type TGetStagingMedicalRecordByIdAction = z.infer<
  typeof GetStagingMedicalRecordByIdActionSchema
>;

export const UpdateStagingMedicalRecordActionSchema = z.object({
  payload: UpdateStagingMedicalRecordValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateStagingMedicalRecordAction = z.infer<
  typeof UpdateStagingMedicalRecordActionSchema
>;

export const ReviewStagingMedicalRecordActionSchema = z.object({
  payload: ReviewStagingMedicalRecordValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TReviewStagingMedicalRecordAction = z.infer<
  typeof ReviewStagingMedicalRecordActionSchema
>;

export const DeleteStagingMedicalRecordActionSchema = z.object({
  payload: DeleteStagingMedicalRecordValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteStagingMedicalRecordAction = z.infer<
  typeof DeleteStagingMedicalRecordActionSchema
>;
