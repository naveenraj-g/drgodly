/**
 * Flag React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / flag
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the Flag UI is scaffolded.
 */

import { z } from "zod";

export const CreateFlagFormSchema = z.object({
  status: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  subject: z.string().optional(),
});
export type TCreateFlagFormSchema = z.infer<typeof CreateFlagFormSchema>;

export const EditFlagFormSchema = z.object({
  status: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
});
export type TEditFlagFormSchema = z.infer<typeof EditFlagFormSchema>;
