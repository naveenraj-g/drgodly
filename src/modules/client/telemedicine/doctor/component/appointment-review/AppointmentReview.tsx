/**
 * AppointmentReview — post-consultation clinical review UI.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * Two-column layout:
 *   Left  — SoapEditor (editable SOAP note from the AI full-report-agent)
 *   Right — ClinicalExtractionPanel (Conditions, Observations, Medications, Orders)
 *
 * Pre-population:
 *   - On first visit: seeds form state from the AI full-report (fullReport prop).
 *   - On revisit: if the encounter already has FHIR resources saved (savedXxx props),
 *     rehydrates from those records so doctor edits are restored.
 *
 * On "Confirm & Save" the component diffs current state against what was loaded:
 *   - Items removed by the doctor  → DELETE
 *   - Items still present with a fhirId → UPDATE (code + status fields)
 *   - Newly added items (no fhirId) → CREATE
 */

"use client";

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CalendarDays, User, Loader2 } from "lucide-react";
import { SoapEditor } from "./soap/SoapEditor";
import { ClinicalExtractionPanel } from "./clinical/ClinicalExtractionPanel";
import { createConditionAction, updateConditionAction, deleteConditionAction } from "@/modules/server/presentation/actions/condition/core.actions";
import { createObservationAction, updateObservationAction, deleteObservationAction } from "@/modules/server/presentation/actions/observation/core.actions";
import { createMedicationRequestAction, updateMedicationRequestAction, deleteMedicationRequestAction } from "@/modules/server/presentation/actions/medication-request/core.actions";
import { createServiceRequestAction, updateServiceRequestAction, deleteServiceRequestAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import type { ClinicalExtractionResult } from "./clinical/ClinicalExtractionPanel";
import type {
  SoapNote,
  ConditionFormItem,
  ObservationFormItem,
  MedicationFormItem,
  ServiceRequestFormItem,
  StagingReport,
} from "./types";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";

// ── Reverse-map FHIR system URL → short terminology system name ───────────────

/** Maps FHIR system URL to the short name used internally (e.g. for TerminologyCombobox). */
const SYSTEM_URL_TO_NAME: Record<string, string> = {
  "http://snomed.info/sct": "SNOMED",
  "http://loinc.org": "LOINC",
  "http://www.nlm.nih.gov/research/umls/rxnorm": "RXNORM",
  "http://hl7.org/fhir/sid/icd-10-cm": "ICD-10",
};

/** Converts a FHIR system URL to a short name; defaults to "SNOMED" if unknown. */
function systemName(url: string | null | undefined): string {
  return (url && SYSTEM_URL_TO_NAME[url]) ?? "SNOMED";
}

// ── FHIR record → FormItem converters ────────────────────────────────────────

/**
 * Parses a free-text duration string (e.g. "7 days", "2 weeks") into a numeric
 * value + UCUM unit string for dosage_instruction.timing_repeat_duration.
 *
 * @param s - Free-text duration from the form.
 * @returns Parsed duration object or null if the string cannot be parsed.
 */
function parseDuration(
  s: string | null | undefined,
): { value: number; unit: string } | null {
  if (!s) return null;
  const m = s
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|hour|hours|min|mins|minute|minutes)$/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const raw = m[2].toLowerCase();
  const unit = raw.startsWith("day")
    ? "d"
    : raw.startsWith("week")
      ? "wk"
      : raw.startsWith("month")
        ? "mo"
        : raw.startsWith("hour")
          ? "h"
          : "min";
  return { value, unit };
}

/**
 * Converts a saved FHIR Condition response to a ConditionFormItem.
 * Sets fhirId so the diff-sync knows to UPDATE rather than CREATE.
 *
 * @param c - Saved FHIR Condition record.
 */
function conditionFromFhir(c: TConditionResponse): ConditionFormItem {
  return {
    id: String(c.id),
    fhirId: c.id,
    display: c.code_display ?? c.code_text ?? "Unknown condition",
    terminologySystem: systemName(c.code_system),
    resolved: c.code_code
      ? {
          code: c.code_code,
          system: c.code_system ?? "",
          display: c.code_display ?? "",
          text: c.code_text ?? c.code_display ?? "",
        }
      : undefined,
    clinicalStatus: c.clinical_status_code ?? undefined,
    verificationStatus: c.verification_status_code ?? undefined,
    severity: c.severity_code ?? undefined,
    category: c.category?.[0]?.coding_code ?? undefined,
    onsetDatetime: c.onset_datetime ?? undefined,
    abatementDatetime: c.abatement_datetime ?? undefined,
    note: c.note?.[0]?.text ?? undefined,
  };
}

/**
 * Converts a saved FHIR Observation response to an ObservationFormItem.
 * Sets fhirId so the diff-sync knows to UPDATE rather than CREATE.
 *
 * @param o - Saved FHIR Observation record.
 */
function observationFromFhir(o: TObservationResponse): ObservationFormItem {
  const numVal = o.value_quantity_value != null ? String(o.value_quantity_value) : null;
  return {
    id: String(o.id),
    fhirId: o.id,
    display: o.code_display ?? o.code_text ?? "Unknown observation",
    terminologySystem: systemName(o.code_system),
    value: numVal ?? o.value_string ?? null,
    unit: o.value_quantity_unit ?? null,
    resolved: o.code_code
      ? {
          code: o.code_code,
          system: o.code_system ?? "",
          display: o.code_display ?? "",
          text: o.code_text ?? o.code_display ?? "",
        }
      : undefined,
    status: o.status ?? undefined,
    effectiveDatetime: o.effective_date_time ?? undefined,
    /* category / interpretation / reference_range are child arrays — not updatable,
       but rehydrate for display so the doctor can see what was saved. */
    category: o.category?.[0]?.coding_code ?? undefined,
    interpretation: o.interpretation?.[0]?.coding_code ?? undefined,
    refRangeLow:
      o.reference_range?.[0]?.low_value != null
        ? String(o.reference_range[0].low_value)
        : undefined,
    refRangeHigh:
      o.reference_range?.[0]?.high_value != null
        ? String(o.reference_range[0].high_value)
        : undefined,
    refRangeUnit: o.reference_range?.[0]?.low_unit ?? undefined,
    note: o.note?.[0]?.text ?? undefined,
  };
}

/**
 * Converts a saved FHIR MedicationRequest response to a MedicationFormItem.
 * Sets fhirId so the diff-sync knows to UPDATE rather than CREATE.
 * Note: dosage_instruction children are immutable in the FHIR API — dosage
 * edits on existing items require delete + re-add by the doctor.
 *
 * @param m - Saved FHIR MedicationRequest record.
 */
function medicationFromFhir(m: TMedicationRequestResponse): MedicationFormItem {
  const dosage = m.dosage_instruction?.[0];
  /* Reconstruct duration string from timing_repeat_duration + unit if present. */
  const durValue = dosage?.timing_repeat_duration;
  const durUnit = dosage?.timing_repeat_duration_unit;
  const duration =
    durValue != null && durUnit
      ? `${durValue} ${durUnit}`
      : null;

  return {
    id: String(m.id),
    fhirId: m.id,
    display: m.medication_code_display ?? m.medication_code_text ?? "Unknown medication",
    terminologySystem: systemName(m.medication_code_system),
    dose: dosage?.text ?? null,
    frequency: dosage?.timing_code_display ?? null,
    duration,
    route: dosage?.route_display ?? dosage?.route_text ?? null,
    resolved: m.medication_code_code
      ? {
          code: m.medication_code_code,
          system: m.medication_code_system ?? "",
          display: m.medication_code_display ?? "",
          text: m.medication_code_text ?? m.medication_code_display ?? "",
        }
      : undefined,
    status: m.status ?? undefined,
    intent: m.intent ?? undefined,
    priority: m.priority ?? undefined,
    courseOfTherapyType: m.course_of_therapy_type_code ?? undefined,
    /* reason_code / note are child arrays — rehydrate first entry for display. */
    reasonCode: m.reason_code?.[0]?.text ?? m.reason_code?.[0]?.coding_display ?? undefined,
    patientInstruction: dosage?.patient_instruction ?? undefined,
    dispenseRepeatsAllowed: m.dispense_number_of_repeats_allowed ?? undefined,
    dispenseQuantityValue:
      m.dispense_quantity_value != null ? String(m.dispense_quantity_value) : undefined,
    dispenseQuantityUnit: m.dispense_quantity_unit ?? undefined,
    substitutionAllowed: m.substitution_allowed_boolean ?? undefined,
    note: m.note?.[0]?.text ?? undefined,
  };
}

/**
 * Converts a saved FHIR ServiceRequest response to a ServiceRequestFormItem.
 * Sets fhirId so the diff-sync knows to UPDATE rather than CREATE.
 *
 * @param s - Saved FHIR ServiceRequest record.
 */
function serviceRequestFromFhir(s: TServiceRequestResponse): ServiceRequestFormItem {
  return {
    id: String(s.id),
    fhirId: s.id,
    display: s.code_display ?? s.code_text ?? "Unknown order",
    terminologySystem: systemName(s.code_system),
    resolved: s.code_code
      ? {
          code: s.code_code,
          system: s.code_system ?? "",
          display: s.code_display ?? "",
          text: s.code_text ?? s.code_display ?? "",
        }
      : undefined,
    status: s.status ?? undefined,
    intent: s.intent ?? undefined,
    priority: s.priority ?? undefined,
    category: s.category?.[0]?.coding_code ?? undefined,
    occurrenceDatetime: s.occurrence_datetime ?? undefined,
    patientInstruction: s.patient_instruction ?? undefined,
    asNeeded: s.as_needed_boolean ?? undefined,
    /* reason_code / note are child arrays — rehydrate first entry for display. */
    reasonCode: s.reason_code?.[0]?.text ?? s.reason_code?.[0]?.coding_display ?? undefined,
    note: s.note?.[0]?.text ?? undefined,
  };
}

// ── Default / empty SOAP ──────────────────────────────────────────────────────

/** Blank SOAP note used when the AI did not generate one. */
const EMPTY_SOAP: SoapNote = {
  subjective: {
    chief_complaint: "",
    history_of_present_illness: "",
    associated_symptoms: [],
  },
  objective: { observations: [] },
  assessment: { possible_conditions: [], clinical_reasoning: "" },
  plan: { next_steps: [], when_to_seek_care: "" },
  summary: "",
};

// ── AI extraction → FormItem converters ──────────────────────────────────────

/** Converts an AI-extracted condition to a ConditionFormItem (no fhirId — will be CREATEd). */
function toConditionItem(c: {
  display: string;
  terminologySystem: string;
}): ConditionFormItem {
  return { ...c, id: crypto.randomUUID() };
}

/** Converts an AI-extracted observation to an ObservationFormItem (no fhirId — will be CREATEd). */
function toObservationItem(o: {
  display: string;
  terminologySystem: string;
  value?: string | null;
  unit?: string | null;
}): ObservationFormItem {
  return { ...o, id: crypto.randomUUID(), value: o.value ?? null, unit: o.unit ?? null };
}

/** Converts an AI-extracted medication to a MedicationFormItem (no fhirId — will be CREATEd). */
function toMedicationItem(m: {
  display: string;
  terminologySystem: string;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
}): MedicationFormItem {
  return {
    ...m,
    id: crypto.randomUUID(),
    dose: m.dose ?? null,
    frequency: m.frequency ?? null,
    duration: m.duration ?? null,
    route: m.route ?? null,
  };
}

/** Converts an AI-extracted service request to a ServiceRequestFormItem (no fhirId — will be CREATEd). */
function toServiceRequestItem(s: {
  display: string;
  terminologySystem: string;
}): ServiceRequestFormItem {
  return { ...s, id: crypto.randomUUID() };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentReviewProps {
  /** FHIR appointment integer ID — used in create action payloads. */
  fhirAppointmentId: number;
  /** FHIR patient integer ID — used as "Patient/<id>" subject on resources. */
  patientId: number;
  /** FHIR encounter integer ID — linked to each created FHIR resource. */
  encounterId: number;
  /** Patient display name shown in the header. */
  patientName: string;
  /** Doctor display name shown in the header. */
  doctorName: string;
  /** Appointment date string for display. */
  appointmentDate?: string | null;
  /**
   * Full report from the AI full-report-agent (stored on the Consultation record).
   * Contains the SOAP note and clinical extraction seeds.
   */
  fullReport?: unknown;
  /**
   * Existing FHIR Conditions linked to this encounter (from a previous save).
   * When non-empty, these take precedence over the AI extraction for initial state.
   */
  savedConditions?: TConditionResponse[];
  /** Existing FHIR Observations linked to this encounter. */
  savedObservations?: TObservationResponse[];
  /** Existing FHIR MedicationRequests linked to this encounter. */
  savedMedications?: TMedicationRequestResponse[];
  /** Existing FHIR ServiceRequests linked to this encounter. */
  savedServiceRequests?: TServiceRequestResponse[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Post-consultation review component.
 * Renders an editable SOAP note alongside AI-extracted FHIR clinical resources.
 * On confirm, diffs current state against loaded state and creates/updates/deletes accordingly.
 *
 * @param fhirAppointmentId - Numeric FHIR appointment ID.
 * @param patientId - Numeric FHIR patient ID (used as subject reference).
 * @param encounterId - Numeric FHIR encounter ID to link all resources.
 * @param patientName - Patient display name.
 * @param doctorName - Doctor display name.
 * @param appointmentDate - Formatted date string for the header.
 * @param fullReport - Raw AI full-report-agent output for pre-population.
 * @param savedConditions - Existing FHIR Conditions for this encounter (revisit).
 * @param savedObservations - Existing FHIR Observations for this encounter (revisit).
 * @param savedMedications - Existing FHIR MedicationRequests for this encounter (revisit).
 * @param savedServiceRequests - Existing FHIR ServiceRequests for this encounter (revisit).
 */
export function AppointmentReview({
  patientId,
  encounterId,
  patientName,
  doctorName,
  appointmentDate,
  fullReport,
  savedConditions = [],
  savedObservations = [],
  savedMedications = [],
  savedServiceRequests = [],
}: AppointmentReviewProps) {
  const rawReport =
    fullReport && typeof fullReport === "object"
      ? (fullReport as Partial<StagingReport>)
      : null;

  /* Seed SOAP note and clinical extraction lists from the AI report. */
  const report: StagingReport = {
    soap: rawReport?.soap ?? EMPTY_SOAP,
    clinicalExtraction: {
      conditions: rawReport?.clinicalExtraction?.conditions ?? [],
      observations: rawReport?.clinicalExtraction?.observations ?? [],
      medicationRequests: rawReport?.clinicalExtraction?.medicationRequests ?? [],
      serviceRequests: rawReport?.clinicalExtraction?.serviceRequests ?? [],
    },
  };

  /* Detect whether a previous save exists for this encounter. */
  const hasSaved =
    savedConditions.length > 0 ||
    savedObservations.length > 0 ||
    savedMedications.length > 0 ||
    savedServiceRequests.length > 0;

  /* Form state — rehydrate from saved FHIR records on revisit, else from AI report. */
  const [soap, setSoap] = useState<SoapNote>(report.soap);
  const [conditions, setConditions] = useState<ConditionFormItem[]>(
    hasSaved
      ? savedConditions.map(conditionFromFhir)
      : report.clinicalExtraction.conditions.map(toConditionItem),
  );
  const [observations, setObservations] = useState<ObservationFormItem[]>(
    hasSaved
      ? savedObservations.map(observationFromFhir)
      : report.clinicalExtraction.observations.map(toObservationItem),
  );
  const [medications, setMedications] = useState<MedicationFormItem[]>(
    hasSaved
      ? savedMedications.map(medicationFromFhir)
      : report.clinicalExtraction.medicationRequests.map(toMedicationItem),
  );
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestFormItem[]>(
    hasSaved
      ? savedServiceRequests.map(serviceRequestFromFhir)
      : report.clinicalExtraction.serviceRequests.map(toServiceRequestItem),
  );
  const [isPending, startTransition] = useTransition();

  /*
   * Track the FHIR IDs that were present at page load.
   * Used during save to detect which records the doctor deleted (present at load, absent now).
   */
  const initialFhirIds = useRef({
    conditions: new Set(savedConditions.map((c) => c.id)),
    observations: new Set(savedObservations.map((o) => o.id)),
    medications: new Set(savedMedications.map((m) => m.id)),
    serviceRequests: new Set(savedServiceRequests.map((s) => s.id)),
  });

  const subject = `Patient/${patientId}`;

  /** Re-populates all four lists when the doctor re-runs clinical extraction. */
  const handleReExtract = (result: ClinicalExtractionResult) => {
    setConditions(result.conditions.map(toConditionItem));
    setObservations(result.observations.map(toObservationItem));
    setMedications(result.medicationRequests.map(toMedicationItem));
    setServiceRequests(result.serviceRequests.map(toServiceRequestItem));
  };

  /**
   * Diffs the current form state against what was loaded from FHIR and applies
   * CREATE / UPDATE / DELETE operations in parallel per resource type.
   *
   * Partitioning logic:
   *  - fhirId present in current list  → UPDATE (doctor may have changed code/status)
   *  - fhirId absent from current list → CREATE (newly added item)
   *  - fhirId present at load but missing now → DELETE (doctor removed it)
   */
  const handleConfirm = () => {
    startTransition(async () => {
      try {
        /* ── Compute deletes: IDs loaded at mount that are no longer in the list ── */
        const currentConditionFhirIds = new Set(
          conditions.filter((c) => c.fhirId).map((c) => c.fhirId!),
        );
        const currentObservationFhirIds = new Set(
          observations.filter((o) => o.fhirId).map((o) => o.fhirId!),
        );
        const currentMedicationFhirIds = new Set(
          medications.filter((m) => m.fhirId).map((m) => m.fhirId!),
        );
        const currentServiceRequestFhirIds = new Set(
          serviceRequests.filter((s) => s.fhirId).map((s) => s.fhirId!),
        );

        const deletedConditionIds = [...initialFhirIds.current.conditions].filter(
          (id) => !currentConditionFhirIds.has(id),
        );
        const deletedObservationIds = [...initialFhirIds.current.observations].filter(
          (id) => !currentObservationFhirIds.has(id),
        );
        const deletedMedicationIds = [...initialFhirIds.current.medications].filter(
          (id) => !currentMedicationFhirIds.has(id),
        );
        const deletedServiceRequestIds = [...initialFhirIds.current.serviceRequests].filter(
          (id) => !currentServiceRequestFhirIds.has(id),
        );

        await Promise.all([
          /* ══ Conditions ══════════════════════════════════════════════════════════ */

          /* DELETE removed conditions */
          ...deletedConditionIds.map((id) =>
            deleteConditionAction({ payload: { id } }),
          ),

          /* UPDATE existing conditions — scalar fields only; child arrays are immutable */
          ...conditions
            .filter((c) => c.fhirId)
            .map((c) =>
              updateConditionAction({
                payload: {
                  id: c.fhirId!,
                  code_code: c.resolved?.code,
                  code_system: c.resolved?.system,
                  code_display: c.resolved?.display ?? c.display,
                  code_text: c.display,
                  clinical_status_code: c.clinicalStatus ?? "active",
                  verification_status_code: c.verificationStatus ?? "confirmed",
                  severity_code: c.severity ?? undefined,
                  onset_datetime: c.onsetDatetime ?? undefined,
                  abatement_datetime: c.abatementDatetime ?? undefined,
                },
              }),
            ),

          /* CREATE new conditions — include child arrays (category, note) */
          ...conditions
            .filter((c) => !c.fhirId)
            .map((c) =>
              createConditionAction({
                payload: {
                  clinical_status_code: c.clinicalStatus ?? "active",
                  verification_status_code: c.verificationStatus ?? "confirmed",
                  severity_code: c.severity ?? undefined,
                  code_code: c.resolved?.code,
                  code_system: c.resolved?.system,
                  code_display: c.resolved?.display ?? c.display,
                  code_text: c.display,
                  subject,
                  encounter_id: encounterId,
                  onset_datetime: c.onsetDatetime ?? undefined,
                  abatement_datetime: c.abatementDatetime ?? undefined,
                  ...(c.category
                    ? { category: [{ coding_code: c.category }] }
                    : {}),
                  ...(c.note ? { note: [{ text: c.note }] } : {}),
                },
              }),
            ),

          /* ══ Observations ════════════════════════════════════════════════════════ */

          /* DELETE removed observations */
          ...deletedObservationIds.map((id) =>
            deleteObservationAction({ payload: { id } }),
          ),

          /* UPDATE existing observations — child arrays (category/interpretation/ref_range/note) are immutable */
          ...observations
            .filter((o) => o.fhirId)
            .map((o) => {
              const rawValue = o.editedValue ?? o.value ?? null;
              const numericValue = rawValue !== null ? parseFloat(rawValue) : undefined;
              const isNumeric = numericValue !== undefined && !isNaN(numericValue);
              return updateObservationAction({
                payload: {
                  id: o.fhirId!,
                  status: o.status ?? "final",
                  code_code: o.resolved?.code,
                  code_system: o.resolved?.system,
                  code_display: o.resolved?.display ?? o.display,
                  code_text: o.display,
                  effective_date_time: o.effectiveDatetime ?? undefined,
                  ...(isNumeric
                    ? {
                        value_quantity_value: numericValue,
                        value_quantity_unit: o.editedUnit ?? o.unit ?? undefined,
                      }
                    : {
                        value_string: rawValue ?? o.display,
                      }),
                },
              });
            }),

          /* CREATE new observations — include all child arrays */
          ...observations
            .filter((o) => !o.fhirId)
            .map((o) => {
              const rawValue = o.editedValue ?? o.value ?? null;
              const numericValue = rawValue !== null ? parseFloat(rawValue) : undefined;
              const isNumeric = numericValue !== undefined && !isNaN(numericValue);

              const refRangeLowNum = o.refRangeLow ? parseFloat(o.refRangeLow) : undefined;
              const refRangeHighNum = o.refRangeHigh ? parseFloat(o.refRangeHigh) : undefined;
              const hasRefRange =
                (refRangeLowNum !== undefined && !isNaN(refRangeLowNum)) ||
                (refRangeHighNum !== undefined && !isNaN(refRangeHighNum));

              return createObservationAction({
                payload: {
                  status: o.status ?? "final",
                  code_code: o.resolved?.code,
                  code_system: o.resolved?.system,
                  code_display: o.resolved?.display ?? o.display,
                  code_text: o.display,
                  effective_date_time: o.effectiveDatetime ?? undefined,
                  ...(isNumeric
                    ? {
                        value_quantity_value: numericValue,
                        value_quantity_unit: o.editedUnit ?? o.unit ?? undefined,
                      }
                    : {
                        value_string: rawValue ?? o.display,
                      }),
                  subject,
                  encounter_id: encounterId,
                  ...(o.category
                    ? { category: [{ coding_code: o.category }] }
                    : {}),
                  ...(o.interpretation
                    ? { interpretation: [{ coding_code: o.interpretation }] }
                    : {}),
                  ...(hasRefRange
                    ? {
                        reference_range: [
                          {
                            ...(refRangeLowNum !== undefined && !isNaN(refRangeLowNum)
                              ? { low_value: refRangeLowNum, low_unit: o.refRangeUnit }
                              : {}),
                            ...(refRangeHighNum !== undefined && !isNaN(refRangeHighNum)
                              ? { high_value: refRangeHighNum, high_unit: o.refRangeUnit }
                              : {}),
                          },
                        ],
                      }
                    : {}),
                  ...(o.note ? { note: [{ text: o.note }] } : {}),
                },
              });
            }),

          /* ══ Medication requests ══════════════════════════════════════════════════ */

          /* DELETE removed medications */
          ...deletedMedicationIds.map((id) =>
            deleteMedicationRequestAction({ payload: { id } }),
          ),

          /* UPDATE existing medications — scalar + dispense fields; dosage_instruction children are immutable */
          ...medications
            .filter((m) => m.fhirId)
            .map((m) =>
              updateMedicationRequestAction({
                payload: {
                  id: m.fhirId!,
                  status: m.status ?? "active",
                  intent: m.intent ?? "order",
                  medication_code_code: m.resolved?.code,
                  medication_code_system: m.resolved?.system,
                  medication_code_display: m.resolved?.display ?? m.display,
                  medication_code_text: m.display,
                  priority: m.priority ?? undefined,
                  course_of_therapy_type_code: m.courseOfTherapyType ?? undefined,
                  dispense_number_of_repeats_allowed:
                    m.dispenseRepeatsAllowed ?? undefined,
                  dispense_quantity_value: m.dispenseQuantityValue
                    ? parseFloat(m.dispenseQuantityValue)
                    : undefined,
                  dispense_quantity_unit: m.dispenseQuantityUnit ?? undefined,
                  substitution_allowed_boolean: m.substitutionAllowed ?? undefined,
                },
              }),
            ),

          /* CREATE new medications — include dosage_instruction + child arrays */
          ...medications
            .filter((m) => !m.fhirId)
            .map((m) => {
              const durStr = m.editedDuration ?? m.duration;
              const parsedDur = parseDuration(durStr);
              return createMedicationRequestAction({
                payload: {
                  status: m.status ?? "active",
                  intent: m.intent ?? "order",
                  medication_code_code: m.resolved?.code,
                  medication_code_system: m.resolved?.system,
                  medication_code_display: m.resolved?.display ?? m.display,
                  medication_code_text: m.display,
                  subject,
                  encounter_id: encounterId,
                  priority: m.priority ?? undefined,
                  course_of_therapy_type_code: m.courseOfTherapyType ?? undefined,
                  dispense_number_of_repeats_allowed:
                    m.dispenseRepeatsAllowed ?? undefined,
                  dispense_quantity_value: m.dispenseQuantityValue
                    ? parseFloat(m.dispenseQuantityValue)
                    : undefined,
                  dispense_quantity_unit: m.dispenseQuantityUnit ?? undefined,
                  substitution_allowed_boolean: m.substitutionAllowed ?? undefined,
                  dosage_instruction: [
                    {
                      text: m.editedDose ?? m.dose ?? undefined,
                      route_display: m.editedRoute ?? m.route ?? undefined,
                      timing_code_display:
                        m.editedFrequency ?? m.frequency ?? undefined,
                      patient_instruction: m.patientInstruction ?? undefined,
                      ...(parsedDur
                        ? {
                            timing_repeat_duration: parsedDur.value,
                            timing_repeat_duration_unit: parsedDur.unit,
                          }
                        : {}),
                    },
                  ],
                  ...(m.reasonCode
                    ? { reason_code: [{ text: m.reasonCode }] }
                    : {}),
                  ...(m.note ? { note: [{ text: m.note }] } : {}),
                },
              });
            }),

          /* ══ Service requests ════════════════════════════════════════════════════ */

          /* DELETE removed service requests */
          ...deletedServiceRequestIds.map((id) =>
            deleteServiceRequestAction({ payload: { id } }),
          ),

          /* UPDATE existing service requests — scalar fields; child arrays are immutable */
          ...serviceRequests
            .filter((s) => s.fhirId)
            .map((s) =>
              updateServiceRequestAction({
                payload: {
                  id: s.fhirId!,
                  status: s.status ?? "active",
                  intent: s.intent ?? "order",
                  code_code: s.resolved?.code,
                  code_system: s.resolved?.system,
                  code_display: s.resolved?.display ?? s.display,
                  code_text: s.display,
                  priority: s.priority ?? undefined,
                  occurrence_datetime: s.occurrenceDatetime ?? undefined,
                  patient_instruction: s.patientInstruction ?? undefined,
                  as_needed_boolean: s.asNeeded ?? undefined,
                },
              }),
            ),

          /* CREATE new service requests — include child arrays (category, reason_code, note) */
          ...serviceRequests
            .filter((s) => !s.fhirId)
            .map((s) =>
              createServiceRequestAction({
                payload: {
                  status: s.status ?? "active",
                  intent: s.intent ?? "order",
                  code_code: s.resolved?.code,
                  code_system: s.resolved?.system,
                  code_display: s.resolved?.display ?? s.display,
                  code_text: s.display,
                  priority: s.priority ?? undefined,
                  subject,
                  encounter_id: encounterId,
                  occurrence_datetime: s.occurrenceDatetime ?? undefined,
                  patient_instruction: s.patientInstruction ?? undefined,
                  as_needed_boolean: s.asNeeded ?? undefined,
                  ...(s.category
                    ? {
                        category: [
                          {
                            coding_system: "http://snomed.info/sct",
                            coding_code: s.category,
                          },
                        ],
                      }
                    : {}),
                  ...(s.reasonCode
                    ? { reason_code: [{ text: s.reasonCode }] }
                    : {}),
                  ...(s.note ? { note: [{ text: s.note }] } : {}),
                },
              }),
            ),
        ]);

        /* Update the initial IDs ref to reflect the new saved state. */
        initialFhirIds.current = {
          conditions: new Set(conditions.filter((c) => c.fhirId).map((c) => c.fhirId!)),
          observations: new Set(observations.filter((o) => o.fhirId).map((o) => o.fhirId!)),
          medications: new Set(medications.filter((m) => m.fhirId).map((m) => m.fhirId!)),
          serviceRequests: new Set(serviceRequests.filter((s) => s.fhirId).map((s) => s.fhirId!)),
        };

        toast.success("Clinical records saved to patient medical history.");
      } catch (err) {
        console.error("[AppointmentReview] save failed:", err);
        toast.error("Failed to save some records. Please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-156px)] gap-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-semibold">Post-Consultation Review</p>
            <p className="text-xs text-muted-foreground">
              Review and confirm AI-generated clinical data before saving to records
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{patientName}</span>
          </div>
          {appointmentDate && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{appointmentDate}</span>
              </div>
            </>
          )}
          <Badge variant="secondary" className="text-xs">
            Dr. {doctorName}
          </Badge>
        </div>

        <Button
          onClick={handleConfirm}
          size="sm"
          className="gap-2"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {isPending ? "Saving..." : "Confirm & Save to Records"}
        </Button>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left: SOAP editor */}
        <div className="w-[420px] shrink-0 border-r flex flex-col min-h-0">
          <div className="px-4 py-3 border-b shrink-0">
            <p className="text-sm font-medium">SOAP Note</p>
            <p className="text-xs text-muted-foreground">
              Edit and review clinical notes
            </p>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              <SoapEditor soap={soap} onChange={setSoap} />
            </div>
          </ScrollArea>
        </div>

        {/* Right: Clinical extraction panel */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b shrink-0">
            <p className="text-sm font-medium">Clinical Extraction</p>
            <p className="text-xs text-muted-foreground">
              {hasSaved
                ? "Previously saved records loaded — edit and save to sync changes"
                : "Confirm terminology codes — AI suggestions are pre-loaded"}
            </p>
          </div>
          <div className="flex-1 min-h-0 p-4">
            <ClinicalExtractionPanel
              soap={soap}
              assessment={rawReport?.assessment}
              conditions={conditions}
              observations={observations}
              medications={medications}
              serviceRequests={serviceRequests}
              onConditionsChange={setConditions}
              onObservationsChange={setObservations}
              onMedicationsChange={setMedications}
              onServiceRequestsChange={setServiceRequests}
              onReExtract={handleReExtract}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
