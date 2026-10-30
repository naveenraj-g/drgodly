/**
 * EpisodeOfCare React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / episode-of-care
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the EpisodeOfCare UI is scaffolded.
 */

import { z } from "zod";
import { EpisodeOfCareStatusSchema } from "./input";

export const CreateEpisodeOfCareFormSchema = z.object({
  status: EpisodeOfCareStatusSchema,
  patient: z.string().optional(),
  managing_organization: z.string().optional(),
  care_manager: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TCreateEpisodeOfCareFormSchema = z.infer<typeof CreateEpisodeOfCareFormSchema>;

export const EditEpisodeOfCareFormSchema = z.object({
  status: EpisodeOfCareStatusSchema.optional(),
  care_manager: z.string().optional(),
  period_end: z.string().optional(),
});
export type TEditEpisodeOfCareFormSchema = z.infer<typeof EditEpisodeOfCareFormSchema>;
