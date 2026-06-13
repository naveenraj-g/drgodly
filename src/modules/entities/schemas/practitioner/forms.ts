/**
 * Practitioner React Hook Form schemas.
 *
 * Layer: entities / schemas / practitioner
 *
 * Flat UI validation schemas for modals and forms. The modal maps flat form
 * values to the nested API payload before calling the server action.
 *
 * Populated by /client-module scaffold — stubs only for now.
 */

import { z } from "zod";

/** Flat create form schema for the practitioner create modal. */
export const CreatePractitionerFormSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  active: z.boolean().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().optional(),
});
export type TCreatePractitionerFormValues = z.infer<typeof CreatePractitionerFormSchema>;

/** Flat edit form schema for the practitioner edit modal. */
export const EditPractitionerFormSchema = z.object({
  active: z.boolean().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().optional(),
  deceased_boolean: z.boolean().optional(),
});
export type TEditPractitionerFormValues = z.infer<typeof EditPractitionerFormSchema>;
