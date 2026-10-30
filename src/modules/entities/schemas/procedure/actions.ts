/**
 * Procedure ZSA server action schemas.
 *
 * Layer: entities / schemas / procedure
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateProcedureValidationSchema,
  UpdateProcedureValidationSchema,
  ListProceduresValidationSchema,
  GetByIdProcedureValidationSchema,
  DeleteProcedureValidationSchema,
} from "./input";

export const CreateProcedureActionSchema = z.object({
  payload: CreateProcedureValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateProcedureAction = z.infer<typeof CreateProcedureActionSchema>;

export const ListProceduresActionSchema = z.object({
  payload: ListProceduresValidationSchema.optional(),
});
export type TListProceduresAction = z.infer<typeof ListProceduresActionSchema>;

export const GetProcedureByIdActionSchema = z.object({
  payload: GetByIdProcedureValidationSchema,
});
export type TGetProcedureByIdAction = z.infer<typeof GetProcedureByIdActionSchema>;

export const UpdateProcedureActionSchema = z.object({
  payload: UpdateProcedureValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateProcedureAction = z.infer<typeof UpdateProcedureActionSchema>;

export const DeleteProcedureActionSchema = z.object({
  payload: DeleteProcedureValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteProcedureAction = z.infer<typeof DeleteProcedureActionSchema>;
