/**
 * PlanDefinition React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / plan-definition
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the PlanDefinition UI is scaffolded.
 */

import { z } from "zod";

export const CreatePlanDefinitionFormSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});
export type TCreatePlanDefinitionFormSchema = z.infer<
  typeof CreatePlanDefinitionFormSchema
>;

export const EditPlanDefinitionFormSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});
export type TEditPlanDefinitionFormSchema = z.infer<
  typeof EditPlanDefinitionFormSchema
>;
