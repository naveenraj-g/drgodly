import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

const toOptionalInt = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : Math.floor(n);
};

/**
 * Validates the observation creation form.
 *
 * Input is merged sessionContext + form data.
 * patient_id and encounter_id come from sessionContext.
 * Transforms into the shape expected by POST /api/fhir/v1/observations/
 */
export const observationCreateSchema = z
  .object({
    // Identity (seeded from session)
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient and encounter from sessionContext
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Observation code — CodeableConcept serverSearch (LOINC)
    code_code: z.preprocess(toOptionalStr, z.string().optional()),
    code_system: z.preprocess(toOptionalStr, z.string().optional()),
    code_display: z.preprocess(toOptionalStr, z.string().optional()),
    code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Status — code-only select (required)
    status: z.preprocess(toOptionalStr, z.string().min(1, "Status is required")),

    // Category — CodeableConcept select
    category_code: z.preprocess(toOptionalStr, z.string().optional()),
    category_system: z.preprocess(toOptionalStr, z.string().optional()),
    category_display: z.preprocess(toOptionalStr, z.string().optional()),
    category_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Value — single free-typed field, resolved to a quantity or a string in
    // the transform below depending on whether it parses as a number. Mirrors
    // observationValueFields() in clinicalPayloads.ts, the review page's
    // equivalent create path, rather than asking the doctor to pick which of
    // two boxes to type into.
    value: z.preprocess(toOptionalStr, z.string().optional()),
    value_quantity_unit: z.preprocess(toOptionalStr, z.string().optional()),
    value_quantity_system: z.preprocess(toOptionalStr, z.string().optional()),
    value_quantity_code: z.preprocess(toOptionalStr, z.string().optional()),

    // Interpretation — code-only select
    interpretation: z.preprocess(toOptionalStr, z.string().optional()),

    // Performer — DataSelect emits performer_ref_id
    performer_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,

    // Observation code
    code_code: d.code_code,
    code_system: d.code_system,
    code_display: d.code_display,
    code_text: d.code_text,

    status: d.status,

    // Category as list
    category: d.category_code
      ? [
          {
            coding_system: d.category_system,
            coding_code: d.category_code,
            coding_display: d.category_display,
            text: d.category_text,
          },
        ]
      : undefined,

    // Auto-detect quantity vs free text from the single Value field — same
    // rule as observationValueFields() in clinicalPayloads.ts. Only one of
    // value_quantity/value_string ends up set.
    ...(() => {
      const numeric = d.value !== undefined ? Number(d.value) : undefined;
      const isNumeric = numeric !== undefined && !isNaN(numeric);
      return isNumeric
        ? {
            value_quantity: numeric,
            value_quantity_unit: d.value_quantity_unit,
            value_quantity_system: d.value_quantity_system,
            value_quantity_code: d.value_quantity_code,
            value_string: undefined,
          }
        : { value_string: d.value };
    })(),

    // Interpretation as list — same CodeableConcept[] shape as category, not
    // flat top-level fields. The real API schema (see
    // src/modules/entities/schemas/observation/input.ts) has no
    // interpretation_code/interpretation_system fields at all; sending them
    // 422s with "Extra inputs are not permitted".
    interpretation: d.interpretation
      ? [
          {
            coding_system:
              "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            coding_code: d.interpretation,
          },
        ]
      : undefined,

    performer: d.performer_ref_id ? `Practitioner/${d.performer_ref_id}` : undefined,
  }));
