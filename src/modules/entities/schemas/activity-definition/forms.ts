/**
 * ActivityDefinition React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / activity-definition
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the ActivityDefinition UI is scaffolded.
 */

import { z } from "zod";

export const CreateActivityDefinitionFormSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  kind: z.string().optional(),
  description: z.string().optional(),
});
export type TCreateActivityDefinitionFormSchema = z.infer<
  typeof CreateActivityDefinitionFormSchema
>;

export const EditActivityDefinitionFormSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  kind: z.string().optional(),
  description: z.string().optional(),
});
export type TEditActivityDefinitionFormSchema = z.infer<
  typeof EditActivityDefinitionFormSchema
>;
