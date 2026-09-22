/**
 * Vitals form schemas for React Hook Form.
 *
 * Layer: entities / schemas / vitals
 *
 * Flat UI schemas — no server-side-stamped fields (org_id) or immutable
 * fields (user_id, patient_id, recorded_at) are exposed here; a future modal
 * maps these onto the create/patch payload before calling the action.
 * Not yet wired to any screen — written ahead of a client module for this
 * resource, following this project's standard schema-folder shape.
 */

import { z } from "zod";

/** Full form schema for a future "Create Vitals" entry form. */
export const CreateVitalsFormSchema = z.object({
  pseudo_id: z.string().optional(),
  pseudo_id2: z.string().optional(),

  steps: z.number().optional(),
  calories_kcal: z.number().optional(),
  distance_meters: z.number().optional(),
  total_active_minutes: z.number().optional(),

  activity_name: z.string().optional(),
  exercise_duration_minutes: z.number().optional(),
  active_zone_minutes: z.number().optional(),
  fatburn_active_zone_minutes: z.number().optional(),
  cardio_active_zone_minutes: z.number().optional(),
  peak_active_zone_minutes: z.number().optional(),

  resting_heart_rate: z.number().optional(),
  heart_rate: z.number().optional(),
  heart_rate_variability: z.number().optional(),
  stress_management_score: z.number().optional(),
  blood_pressure_systolic: z.number().optional(),
  blood_pressure_diastolic: z.number().optional(),

  sleep_minutes: z.number().optional(),
  rem_sleep_minutes: z.number().optional(),
  deep_sleep_minutes: z.number().optional(),
  light_sleep_minutes: z.number().optional(),
  awake_minutes: z.number().optional(),
  bed_time: z.string().optional(),
  wake_up_time: z.string().optional(),
  deep_sleep_percent: z.number().optional(),
  rem_sleep_percent: z.number().optional(),
  light_sleep_percent: z.number().optional(),
  awake_percent: z.number().optional(),

  weight_kg: z.number().optional(),
  height_cm: z.number().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),

  recorded_at: z.string().optional(),
  date: z.string().optional(),
});
export type TCreateVitalsFormSchema = z.infer<typeof CreateVitalsFormSchema>;

/** Edit form schema — only the fields fhir-gql's PATCH contract allows. */
export const EditVitalsFormSchema = CreateVitalsFormSchema.omit({
  recorded_at: true,
});
export type TEditVitalsFormSchema = z.infer<typeof EditVitalsFormSchema>;
