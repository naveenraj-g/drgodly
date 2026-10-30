/**
 * CareTeam React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / care-team
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the CareTeam UI is scaffolded.
 */

import { z } from "zod";

export const CreateCareTeamFormSchema = z.object({
  status: z.string().optional(),
  name: z.string().optional(),
  subject: z.string().optional(),
  encounter: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TCreateCareTeamFormSchema = z.infer<typeof CreateCareTeamFormSchema>;

export const EditCareTeamFormSchema = z.object({
  status: z.string().optional(),
  name: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TEditCareTeamFormSchema = z.infer<typeof EditCareTeamFormSchema>;
