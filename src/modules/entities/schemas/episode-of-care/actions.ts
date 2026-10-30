/**
 * EpisodeOfCare ZSA server action schemas.
 *
 * Layer: entities / schemas / episode-of-care
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateEpisodeOfCareValidationSchema,
  UpdateEpisodeOfCareValidationSchema,
  ListEpisodeOfCaresValidationSchema,
  GetByIdEpisodeOfCareValidationSchema,
  DeleteEpisodeOfCareValidationSchema,
} from "./input";

export const CreateEpisodeOfCareActionSchema = z.object({
  payload: CreateEpisodeOfCareValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateEpisodeOfCareAction = z.infer<typeof CreateEpisodeOfCareActionSchema>;

export const ListEpisodeOfCaresActionSchema = z.object({
  payload: ListEpisodeOfCaresValidationSchema.optional(),
});
export type TListEpisodeOfCaresAction = z.infer<typeof ListEpisodeOfCaresActionSchema>;

export const GetEpisodeOfCareByIdActionSchema = z.object({
  payload: GetByIdEpisodeOfCareValidationSchema,
});
export type TGetEpisodeOfCareByIdAction = z.infer<typeof GetEpisodeOfCareByIdActionSchema>;

export const UpdateEpisodeOfCareActionSchema = z.object({
  payload: UpdateEpisodeOfCareValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateEpisodeOfCareAction = z.infer<typeof UpdateEpisodeOfCareActionSchema>;

export const DeleteEpisodeOfCareActionSchema = z.object({
  payload: DeleteEpisodeOfCareValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteEpisodeOfCareAction = z.infer<typeof DeleteEpisodeOfCareActionSchema>;
