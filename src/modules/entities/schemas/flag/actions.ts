/**
 * Flag ZSA server action schemas.
 *
 * Layer: entities / schemas / flag
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateFlagValidationSchema,
  UpdateFlagValidationSchema,
  ListFlagsValidationSchema,
  GetByIdFlagValidationSchema,
  DeleteFlagValidationSchema,
} from "./input";

export const CreateFlagActionSchema = z.object({
  payload: CreateFlagValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateFlagAction = z.infer<typeof CreateFlagActionSchema>;

export const ListFlagsActionSchema = z.object({
  payload: ListFlagsValidationSchema.optional(),
});
export type TListFlagsAction = z.infer<typeof ListFlagsActionSchema>;

export const GetFlagByIdActionSchema = z.object({
  payload: GetByIdFlagValidationSchema,
});
export type TGetFlagByIdAction = z.infer<typeof GetFlagByIdActionSchema>;

export const UpdateFlagActionSchema = z.object({
  payload: UpdateFlagValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateFlagAction = z.infer<typeof UpdateFlagActionSchema>;

export const DeleteFlagActionSchema = z.object({
  payload: DeleteFlagValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteFlagAction = z.infer<typeof DeleteFlagActionSchema>;
