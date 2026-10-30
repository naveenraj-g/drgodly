/**
 * Task ZSA server action schemas.
 *
 * Layer: entities / schemas / task
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateTaskValidationSchema,
  UpdateTaskValidationSchema,
  ListTasksValidationSchema,
  GetByIdTaskValidationSchema,
  DeleteTaskValidationSchema,
} from "./input";

export const CreateTaskActionSchema = z.object({
  payload: CreateTaskValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateTaskAction = z.infer<typeof CreateTaskActionSchema>;

export const ListTasksActionSchema = z.object({
  payload: ListTasksValidationSchema.optional(),
});
export type TListTasksAction = z.infer<typeof ListTasksActionSchema>;

export const GetTaskByIdActionSchema = z.object({
  payload: GetByIdTaskValidationSchema,
});
export type TGetTaskByIdAction = z.infer<typeof GetTaskByIdActionSchema>;

export const UpdateTaskActionSchema = z.object({
  payload: UpdateTaskValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateTaskAction = z.infer<typeof UpdateTaskActionSchema>;

export const DeleteTaskActionSchema = z.object({
  payload: DeleteTaskValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteTaskAction = z.infer<typeof DeleteTaskActionSchema>;
