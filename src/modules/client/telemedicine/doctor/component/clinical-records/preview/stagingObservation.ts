/**
 * stagingObservation — reads AI-extracted and already-stored observations
 * into one shared row shape the Extracted tab can render and edit, and maps
 * a (possibly doctor-edited) row into the ObservationFormItem
 * persistClinicalEntry already knows how to write.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * Two sources feed the same row shape:
 *   - StagingObservationResponse — the agent's not-yet-reviewed extraction.
 *   - TObservationResponse       — the real FHIR Observation, once accepted.
 * Both carry every possible FHIR Observation value field as a nullable
 * column with identical names, so `observationValue` reads either one —
 * the panel and the accept-time write can never disagree about what a row's
 * value is, whether it's still AI output or already a stored record.
 */
import type { TStagingObservationResponse } from "@/modules/entities/schemas/staging-medical-record";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { ObservationFormItem } from "../../appointment-review/types";

// ── Value resolution ─────────────────────────────────────────────────────────
// Structural, not by-name: satisfied by both TStagingObservationResponse and
// TObservationResponse, which share these field names and nullability.

interface HasObservationValueFields {
  value_quantity_value?: number | null;
  value_quantity_unit?: string | null;
  value_string?: string | null;
  value_codeable_concept_display?: string | null;
  value_codeable_concept_text?: string | null;
  value_boolean?: boolean | null;
  value_integer?: number | null;
  value_date_time?: string | null;
  value_time?: string | null;
}

/** One resolved value[x], or null when nothing on the row was populated. */
export interface ObservationValue {
  value: string;
  unit: string | null;
}

/**
 * Picks the first populated value[x] field off an observation-shaped record.
 *
 * @param obs - A staging or real FHIR observation.
 */
export function observationValue(
  obs: HasObservationValueFields,
): ObservationValue | null {
  if (obs.value_quantity_value != null) {
    return {
      value: String(obs.value_quantity_value),
      unit: obs.value_quantity_unit ?? null,
    };
  }
  if (obs.value_string) return { value: obs.value_string, unit: null };
  if (obs.value_codeable_concept_display) {
    return { value: obs.value_codeable_concept_display, unit: null };
  }
  if (obs.value_codeable_concept_text) {
    return { value: obs.value_codeable_concept_text, unit: null };
  }
  if (obs.value_boolean != null) {
    return { value: obs.value_boolean ? "Yes" : "No", unit: null };
  }
  if (obs.value_integer != null) {
    return { value: String(obs.value_integer), unit: null };
  }
  if (obs.value_date_time) return { value: obs.value_date_time, unit: null };
  if (obs.value_time) return { value: obs.value_time, unit: null };
  return null;
}

interface HasReferenceRange {
  reference_range?:
    | ({
        low_value?: number | null;
        low_unit?: string | null;
        high_value?: number | null;
        high_unit?: string | null;
        text?: string | null;
      } | null)[]
    | null;
}

/**
 * Formats a reference range as "13.0–17.0 g/dL"-style text, only including
 * whichever bound is actually present.
 *
 * @param obs - A staging or real FHIR observation.
 */
export function observationReferenceRange(obs: HasReferenceRange): string | null {
  const range = obs.reference_range?.[0];
  if (!range) return null;
  if (range.text) return range.text;

  const parts: string[] = [];
  if (range.low_value != null) parts.push(String(range.low_value));
  if (range.high_value != null) parts.push(String(range.high_value));
  if (parts.length === 0) return null;

  const unit = range.high_unit ?? range.low_unit;
  const bounds = parts.join(range.low_value != null && range.high_value != null ? "–" : "");
  return unit ? `${bounds} ${unit}` : bounds;
}

/** Interpretation codes that mark a result as outside its expected range. */
const OUT_OF_RANGE_CODES = new Set(["H", "HH", "L", "LL", "A", "AA", "HU", "LU"]);

interface HasInterpretation {
  interpretation?: ({ coding_code?: string | null } | null)[] | null;
}

/**
 * Whether this observation is flagged as outside its reference range.
 *
 * @param obs - A staging or real FHIR observation.
 */
export function isObservationOutOfRange(obs: HasInterpretation): boolean {
  const code = obs.interpretation?.[0]?.coding_code;
  return code != null && OUT_OF_RANGE_CODES.has(code.toUpperCase());
}

// ── Display row ──────────────────────────────────────────────────────────────

/**
 * Doctor review state for one row:
 *   - "pending" — still AI output, not yet pushed. No per-row approve/reject —
 *     the whole batch is edited then pushed together; see ExtractedDataPanel's
 *     file header comment for why.
 *   - "stored"  — already a real FHIR Observation; editable, not re-created.
 */
export type StagingReviewState = "pending" | "stored";

/** One observation, shaped for the review panel — editable either way. */
export interface StagingObservationRow {
  /** Stable key — the source row's own id (staging_observation or Observation). */
  key: string;
  /** What was measured. */
  display: string;
  /** The measured value, as text — not every result is numeric. */
  value: string;
  /** Unit, when the result carries one. */
  unit: string;
  /** Reference range as text, e.g. "13.0–17.0 g/dL". */
  referenceRange: string;
  outOfRange: boolean;
  category: string | null;
  /** Human-readable label, e.g. "High" — shown in the UI. */
  interpretation: string | null;
  /** Coding code, e.g. "H" — what actually gets written on accept/save. */
  interpretationCode: string | null;
  effectiveDatetime: string | null;
  note: string | null;
  codeSystem: string | null;
  codeCode: string | null;
  codeText: string | null;
  state: StagingReviewState;
  /** FHIR Observation.id — set only for "stored" rows; routes edits to update, not create. */
  fhirId?: number;
}

/**
 * Converts one staging observation into an editable review row ("pending").
 * Only fields that were actually present on the source are non-empty here —
 * the panel renders conditionally on that, rather than printing a fixed
 * field list.
 *
 * @param obs - The staging observation row from the API.
 */
export function toStagingObservationRow(
  obs: TStagingObservationResponse,
): StagingObservationRow {
  const resolvedValue = observationValue(obs);
  return {
    key: String(obs.id),
    display: obs.code_display ?? obs.code_text ?? "Unnamed finding",
    value: resolvedValue?.value ?? "",
    unit: resolvedValue?.unit ?? "",
    referenceRange: observationReferenceRange(obs) ?? "",
    outOfRange: isObservationOutOfRange(obs),
    category: obs.category?.[0]?.coding_code ?? obs.category?.[0]?.text ?? null,
    interpretation:
      obs.interpretation?.[0]?.coding_display ??
      obs.interpretation?.[0]?.coding_code ??
      null,
    interpretationCode: obs.interpretation?.[0]?.coding_code ?? null,
    effectiveDatetime: obs.effective_date_time ?? null,
    note: obs.note?.[0]?.text ?? null,
    codeSystem: obs.code_system ?? null,
    codeCode: obs.code_code ?? null,
    codeText: obs.code_text ?? null,
    state: "pending",
  };
}

/**
 * Converts a real, already-accepted FHIR Observation into a "stored" review
 * row — editable via update rather than create.
 *
 * @param obs - The FHIR Observation, resolved via encounter_id + based_on.
 */
export function toStoredObservationRow(
  obs: TObservationResponse,
): StagingObservationRow {
  const resolvedValue = observationValue(obs);
  return {
    key: String(obs.id),
    display: obs.code_display ?? obs.code_text ?? "Unnamed finding",
    value: resolvedValue?.value ?? "",
    unit: resolvedValue?.unit ?? "",
    referenceRange: observationReferenceRange(obs) ?? "",
    outOfRange: isObservationOutOfRange(obs),
    category: obs.category?.[0]?.coding_code ?? obs.category?.[0]?.text ?? null,
    interpretation:
      obs.interpretation?.[0]?.coding_display ??
      obs.interpretation?.[0]?.coding_code ??
      null,
    interpretationCode: obs.interpretation?.[0]?.coding_code ?? null,
    effectiveDatetime: obs.effective_date_time ?? null,
    note: obs.note?.[0]?.text ?? null,
    codeSystem: obs.code_system ?? null,
    codeCode: obs.code_code ?? null,
    codeText: obs.code_text ?? null,
    state: "stored",
    fhirId: obs.id,
  };
}

// ── Accept / save-time mapping ───────────────────────────────────────────────

/**
 * Builds the ObservationFormItem persistClinicalEntry expects, from a
 * (possibly doctor-edited) review row.
 *
 * A "stored" row carries fhirId, so persistClinicalEntry updates the
 * existing Observation instead of creating a new one — that's what lets a
 * doctor edit an already-accepted finding without duplicating it. Every
 * other state creates, tagged with based_on so a later visit can find it
 * again by its order (see basedOnServiceRequestId on ObservationFormItem).
 *
 * @param row - The review row, after any doctor edits.
 * @param serviceRequestId - The order this observation resulted from, when known.
 */
export function stagingRowToObservationFormItem(
  row: StagingObservationRow,
  serviceRequestId: number | null | undefined,
): ObservationFormItem {
  return {
    id: `staging-${row.key}`,
    fhirId: row.fhirId,
    display: row.display,
    terminologySystem: row.codeSystem ?? "LOINC",
    value: row.value || null,
    unit: row.unit || null,
    resolved: row.codeCode
      ? {
          code: row.codeCode,
          system: row.codeSystem ?? "",
          display: row.display,
          text: row.codeText ?? row.display,
        }
      : undefined,
    category: row.category ?? undefined,
    interpretation: row.interpretationCode ?? undefined,
    effectiveDatetime: row.effectiveDatetime ?? undefined,
    note: row.note ?? undefined,
    basedOnServiceRequestId:
      row.fhirId == null && serviceRequestId != null ? serviceRequestId : undefined,
  };
}
