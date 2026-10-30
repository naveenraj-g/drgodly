/**
 * Task React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / task
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the Task UI is scaffolded.
 */

import { z } from "zod";

export const CreateTaskFormSchema = z.object({
  status: z.string().optional(),
  intent: z.string().optional(),
  priority: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  description: z.string().optional(),
  for: z.string().optional(),
  owner: z.string().optional(),
  encounter: z.string().optional(),
});
export type TCreateTaskFormSchema = z.infer<typeof CreateTaskFormSchema>;

export const EditTaskFormSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  business_status_display: z.string().optional(),
  owner: z.string().optional(),
});
export type TEditTaskFormSchema = z.infer<typeof EditTaskFormSchema>;
