/**
 * CarePlan ZSA server action schemas.
 *
 * Layer: entities / schemas / care-plan
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateCarePlanValidationSchema,
  UpdateCarePlanValidationSchema,
  ListCarePlansValidationSchema,
  GetByIdCarePlanValidationSchema,
  DeleteCarePlanValidationSchema,
} from "./input";

export const CreateCarePlanActionSchema = z.object({
  payload: CreateCarePlanValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateCarePlanAction = z.infer<typeof CreateCarePlanActionSchema>;

export const ListCarePlansActionSchema = z.object({
  payload: ListCarePlansValidationSchema.optional(),
});
export type TListCarePlansAction = z.infer<typeof ListCarePlansActionSchema>;

export const GetCarePlanByIdActionSchema = z.object({
  payload: GetByIdCarePlanValidationSchema,
});
export type TGetCarePlanByIdAction = z.infer<typeof GetCarePlanByIdActionSchema>;

export const UpdateCarePlanActionSchema = z.object({
  payload: UpdateCarePlanValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateCarePlanAction = z.infer<typeof UpdateCarePlanActionSchema>;

export const DeleteCarePlanActionSchema = z.object({
  payload: DeleteCarePlanValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteCarePlanAction = z.infer<typeof DeleteCarePlanActionSchema>;
