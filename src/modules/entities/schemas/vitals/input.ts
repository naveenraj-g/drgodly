/**
 * Vitals input validation schemas and DTO types.
 *
 * Layer: entities / schemas / vitals
 *
 * Mirrors fhir-gql's input Pydantic models exactly (app/schemas/vitals/input.py).
 * Covers: create / patch / list / getById / delete validation schemas.
 *
 * Vitals is a custom, non-FHIR resource (wearable/manual health and activity
 * metrics) — flat scalar fields only, no sub-resource arrays.
 *
 * user_id/patient_id/org_id/recorded_at are immutable after creation (per
 * fhir-gql's VitalsPatchSchema) — intentionally absent from the patch schema
 * below. org_id is stamped from the session server-side, same as every other
 * FHIR_GQL_URL-backed resource; user_id is left as an optional pass-through
 * field (not session-stamped) matching fhir-gql's own contract of resolving
 * the linked patient from the JWT sub claim when it's omitted.
 */

import { z } from "zod";

// ── Input validation schemas ───────────────────────────────────────────────────

/**
 * Full schema for creating a Vitals entry.
 * Mirrors fhir-gql's VitalsCreateSchema — every field is optional.
 */
export const CreateVitalsValidationSchema = z.object({
  // Identity
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  pseudo_id: z.string().optional(),
  pseudo_id2: z.string().optional(),
  patient_id: z.number().optional(),

  // Core Activity
  steps: z.number().optional(),
  calories_kcal: z.number().optional(),
  distance_meters: z.number().optional(),
  total_active_minutes: z.number().optional(),

  // Exercise
  activity_name: z.string().optional(),
  exercise_duration_minutes: z.number().optional(),
  active_zone_minutes: z.number().optional(),
  fatburn_active_zone_minutes: z.number().optional(),
  cardio_active_zone_minutes: z.number().optional(),
  peak_active_zone_minutes: z.number().optional(),

  // Vitals (heart / stress / blood pressure)
  resting_heart_rate: z.number().optional(),
  heart_rate: z.number().optional(),
  heart_rate_variability: z.number().optional(),
  stress_management_score: z.number().optional(),
  blood_pressure_systolic: z.number().optional(),
  blood_pressure_diastolic: z.number().optional(),

  // Sleep
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

  // Biometrics
  weight_kg: z.number().optional(),
  height_cm: z.number().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),

  // Metadata
  recorded_at: z.string().optional(),
  date: z.string().optional(),
});
export type TCreateVitals = z.infer<typeof CreateVitalsValidationSchema>;

/**
 * Base patch fields (no id, no refinement) — used for the service dto and as
 * the foundation for the full validation schema. All metric fields are
 * patchable; user_id/patient_id/org_id/recorded_at are immutable after
 * creation, matching fhir-gql's VitalsPatchSchema exactly.
 */
const PatchVitalsBaseSchema = z.object({
  pseudo_id: z.string().optional(),
  pseudo_id2: z.string().optional(),
  patient_id: z.number().optional(),

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

  // recorded_at is immutable after creation, so only `date` is patchable.
  date: z.string().optional(),
});

/** Dto variant (no id) — used by the service interface update method. */
export const PatchVitalsDtoSchema = PatchVitalsBaseSchema;
export type TPatchVitalsDto = z.infer<typeof PatchVitalsDtoSchema>;

/**
 * Full patch validation schema — includes id and enforces that at least one
 * patchable field is present.
 */
export const PatchVitalsValidationSchema = PatchVitalsBaseSchema.extend({
  id: z.number(),
}).refine(
  (fields) => Object.entries(fields).some(([key, value]) => key !== "id" && value !== undefined),
  { message: "At least one field must be provided for update" },
);
export type TPatchVitals = z.infer<typeof PatchVitalsValidationSchema>;

/**
 * Query parameters for listing vitals entries (server-side filtering + pagination).
 * Mirrors fhir-gql's ListVitalsSchema: user_id, patient_id, org_id, an exact
 * `date` match, and a `recorded_at` datetime range. Results are ordered by
 * recorded_at descending (newest first) by fhir-gql.
 */
export const ListVitalsValidationSchema = z.object({
  user_id: z.string().optional(),
  patient_id: z.number().optional(),
  /** Filter by tenant organization ID — scopes results to a single tenant. */
  org_id: z.string().optional(),
  date: z.string().optional(),
  recorded_at_from: z.string().optional(),
  recorded_at_to: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListVitalsQuery = z.infer<typeof ListVitalsValidationSchema>;

export const GetVitalsByIdValidationSchema = z.object({ id: z.number() });
export type TGetVitalsById = z.infer<typeof GetVitalsByIdValidationSchema>;

export const DeleteVitalsValidationSchema = z.object({ id: z.number() });
export type TDeleteVitals = z.infer<typeof DeleteVitalsValidationSchema>;
