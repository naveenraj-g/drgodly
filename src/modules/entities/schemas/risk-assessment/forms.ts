/**
 * RiskAssessment React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / risk-assessment
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the RiskAssessment UI is scaffolded.
 */

import { z } from "zod";

export const CreateRiskAssessmentFormSchema = z.object({
  subject: z.string().optional(),
  status: z.string().optional(),
  condition: z.string().optional(),
  mitigation: z.string().optional(),
});
export type TCreateRiskAssessmentFormSchema = z.infer<
  typeof CreateRiskAssessmentFormSchema
>;

export const EditRiskAssessmentFormSchema = z.object({
  subject: z.string().optional(),
  status: z.string().optional(),
  condition: z.string().optional(),
  mitigation: z.string().optional(),
});
export type TEditRiskAssessmentFormSchema = z.infer<
  typeof EditRiskAssessmentFormSchema
>;
