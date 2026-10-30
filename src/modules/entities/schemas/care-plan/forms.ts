/**
 * CarePlan React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / care-plan
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the CarePlan UI is scaffolded.
 */

import { z } from "zod";

export const CreateCarePlanFormSchema = z.object({
  title: z.string().optional(),
  status: z.string().optional(),
  intent: z.string().optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
});
export type TCreateCarePlanFormSchema = z.infer<
  typeof CreateCarePlanFormSchema
>;

export const EditCarePlanFormSchema = z.object({
  title: z.string().optional(),
  status: z.string().optional(),
  intent: z.string().optional(),
  description: z.string().optional(),
});
export type TEditCarePlanFormSchema = z.infer<
  typeof EditCarePlanFormSchema
>;
