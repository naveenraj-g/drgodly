/**
 * CareTeam ZSA server action schemas.
 *
 * Layer: entities / schemas / care-team
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateCareTeamValidationSchema,
  UpdateCareTeamValidationSchema,
  ListCareTeamsValidationSchema,
  GetByIdCareTeamValidationSchema,
  DeleteCareTeamValidationSchema,
} from "./input";

export const CreateCareTeamActionSchema = z.object({
  payload: CreateCareTeamValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateCareTeamAction = z.infer<typeof CreateCareTeamActionSchema>;

export const ListCareTeamsActionSchema = z.object({
  payload: ListCareTeamsValidationSchema.optional(),
});
export type TListCareTeamsAction = z.infer<typeof ListCareTeamsActionSchema>;

export const GetCareTeamByIdActionSchema = z.object({
  payload: GetByIdCareTeamValidationSchema,
});
export type TGetCareTeamByIdAction = z.infer<typeof GetCareTeamByIdActionSchema>;

export const UpdateCareTeamActionSchema = z.object({
  payload: UpdateCareTeamValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateCareTeamAction = z.infer<typeof UpdateCareTeamActionSchema>;

export const DeleteCareTeamActionSchema = z.object({
  payload: DeleteCareTeamValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteCareTeamAction = z.infer<typeof DeleteCareTeamActionSchema>;
