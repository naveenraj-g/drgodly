/**
 * Questionnaire React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / questionnaire
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the Questionnaire UI is scaffolded.
 */

import { z } from "zod";

export const CreateQuestionnaireFormSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});
export type TCreateQuestionnaireFormSchema = z.infer<
  typeof CreateQuestionnaireFormSchema
>;

export const EditQuestionnaireFormSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});
export type TEditQuestionnaireFormSchema = z.infer<
  typeof EditQuestionnaireFormSchema
>;
