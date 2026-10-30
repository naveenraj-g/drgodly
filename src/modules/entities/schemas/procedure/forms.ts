/**
 * Procedure React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / procedure
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the Procedure UI is scaffolded.
 */

import { z } from "zod";

export const CreateProcedureFormSchema = z.object({
  status: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  subject: z.string().optional(),
  encounter_id: z.number().int().optional(),
  performed_datetime: z.string().optional(),
});
export type TCreateProcedureFormSchema = z.infer<typeof CreateProcedureFormSchema>;

export const EditProcedureFormSchema = z.object({
  status: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  outcome_display: z.string().optional(),
});
export type TEditProcedureFormSchema = z.infer<typeof EditProcedureFormSchema>;
