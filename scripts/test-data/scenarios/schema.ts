/**
 * Zod shape for a scenario fixture file.
 *
 * Wraps the app's own Create*ValidationSchema for each resource (imported
 * directly — never redeclared) under a `{ name, create }` pair so cross-resource
 * references within one scenario (e.g. a DiagnosticReport's `resultFrom` naming
 * an Observation) have something to key off, without inventing a separate schema
 * per resource. `create` is exactly the payload that gets POSTed, after
 * placeholder resolution — validating the whole scenario against this schema is
 * what `--dry-run` (and the pre-flight check before any writes) runs against.
 */

import { z } from "zod";
import { CreateAppointmentValidationSchema } from "@/modules/entities/schemas/appointment";
import { CreateEncounterValidationSchema } from "@/modules/entities/schemas/encounter";
import { CreateConditionValidationSchema } from "@/modules/entities/schemas/condition";
import { CreateObservationValidationSchema } from "@/modules/entities/schemas/observation";
import { CreateMedicationRequestValidationSchema } from "@/modules/entities/schemas/medication-request";
import { CreateServiceRequestValidationSchema } from "@/modules/entities/schemas/service-request";
import { CreateDiagnosticReportValidationSchema } from "@/modules/entities/schemas/diagnostic-report";

export const NamedConditionSchema = z.object({
  name: z.string(),
  create: CreateConditionValidationSchema,
});

export const NamedObservationSchema = z.object({
  name: z.string(),
  create: CreateObservationValidationSchema,
});

export const NamedMedicationRequestSchema = z.object({
  name: z.string(),
  create: CreateMedicationRequestValidationSchema,
});

export const NamedServiceRequestSchema = z.object({
  name: z.string(),
  create: CreateServiceRequestValidationSchema,
});

export const NamedDiagnosticReportSchema = z.object({
  name: z.string(),
  create: CreateDiagnosticReportValidationSchema,
  /** Names of entries in `observations[]` whose created IDs become this report's
   *  `result[]` via a follow-up PATCH (Create schema has no `result` field —
   *  it's PATCH-only per the schema's own doc comment). */
  resultFrom: z.array(z.string()).optional(),
});

export const ScenarioMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  diagnosisCodes: z.array(z.string()).optional(),
  expectedUi: z.string(),
});

export const ScenarioSchema = z.object({
  meta: ScenarioMetaSchema,
  appointment: CreateAppointmentValidationSchema,
  encounter: CreateEncounterValidationSchema,
  conditions: z.array(NamedConditionSchema),
  observations: z.array(NamedObservationSchema),
  medicationRequests: z.array(NamedMedicationRequestSchema),
  serviceRequests: z.array(NamedServiceRequestSchema),
  diagnosticReports: z.array(NamedDiagnosticReportSchema),
});
export type TScenario = z.infer<typeof ScenarioSchema>;
