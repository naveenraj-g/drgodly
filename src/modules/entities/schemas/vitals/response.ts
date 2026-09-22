/**
 * Vitals response schemas.
 *
 * Layer: entities / schemas / vitals
 *
 * Mirrors fhir-gql's app/schemas/vitals/response.py. All optional fields use
 * .nullish() — the fhir-gql API serialises Python's Optional[X] = None as
 * explicit JSON null, not as a missing key.
 *
 * Vitals is a custom, non-FHIR resource (wearable/manual health and activity
 * metrics) — there is no FHIR R4 representation, so unlike other resources
 * here there are no sub-resource arrays (identifier, coding, etc.), just a
 * flat set of scalar metric fields.
 */

import { z } from "zod";

/** Full Vitals entry returned by the fhir-gql API. */
export const VitalsResponseSchema = z.object({
  id: z.number(),

  // Identity
  pseudo_id: z.string().nullish(),
  pseudo_id2: z.string().nullish(),
  user_id: z.string().nullish(),
  patient_id: z.number().nullish(),
  org_id: z.string().nullish(),

  // Core Activity
  steps: z.number().nullish(),
  calories_kcal: z.number().nullish(),
  distance_meters: z.number().nullish(),
  total_active_minutes: z.number().nullish(),

  // Exercise
  activity_name: z.string().nullish(),
  exercise_duration_minutes: z.number().nullish(),
  active_zone_minutes: z.number().nullish(),
  fatburn_active_zone_minutes: z.number().nullish(),
  cardio_active_zone_minutes: z.number().nullish(),
  peak_active_zone_minutes: z.number().nullish(),

  // Vitals (heart / stress / blood pressure)
  resting_heart_rate: z.number().nullish(),
  heart_rate: z.number().nullish(),
  heart_rate_variability: z.number().nullish(),
  stress_management_score: z.number().nullish(),
  blood_pressure_systolic: z.number().nullish(),
  blood_pressure_diastolic: z.number().nullish(),

  // Sleep
  sleep_minutes: z.number().nullish(),
  rem_sleep_minutes: z.number().nullish(),
  deep_sleep_minutes: z.number().nullish(),
  light_sleep_minutes: z.number().nullish(),
  awake_minutes: z.number().nullish(),
  bed_time: z.string().nullish(),
  wake_up_time: z.string().nullish(),
  deep_sleep_percent: z.number().nullish(),
  rem_sleep_percent: z.number().nullish(),
  light_sleep_percent: z.number().nullish(),
  awake_percent: z.number().nullish(),

  // Biometrics
  weight_kg: z.number().nullish(),
  height_cm: z.number().nullish(),
  age: z.number().nullish(),
  gender: z.string().nullish(),

  // Metadata
  recorded_at: z.string().nullish(),
  date: z.string().nullish(),

  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TVitalsResponse = z.infer<typeof VitalsResponseSchema>;

/**
 * Paginated list response — { total, limit, offset, data: TVitalsResponse[] }.
 */
export const PaginatedVitalsResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(VitalsResponseSchema),
});
export type TPaginatedVitalsResponse = z.infer<typeof PaginatedVitalsResponseSchema>;
