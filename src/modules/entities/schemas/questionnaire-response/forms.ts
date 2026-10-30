/**
 * QuestionnaireResponse React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / questionnaire-response
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the QuestionnaireResponse UI is scaffolded.
 */

import { z } from "zod";

export const CreateQuestionnaireResponseFormSchema = z.object({
  questionnaire: z.string().optional(),
  status: z.string().optional(),
  subject: z.string().optional(),
  authored: z.string().optional(),
});
export type TCreateQuestionnaireResponseFormSchema = z.infer<
  typeof CreateQuestionnaireResponseFormSchema
>;

export const EditQuestionnaireResponseFormSchema = z.object({
  questionnaire: z.string().optional(),
  status: z.string().optional(),
  subject: z.string().optional(),
  authored: z.string().optional(),
});
export type TEditQuestionnaireResponseFormSchema = z.infer<
  typeof EditQuestionnaireResponseFormSchema
>;
