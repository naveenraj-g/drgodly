/**
 * publishClinicalRecords — pushes staged clinical form state into the EMR (FHIR).
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * This is the "accept" half of the staging→accept→EMR model. Doctor edits live
 * in local form state (and, on the Clinical Records workspace, in the
 * Consultation staging row); calling this writes them to fhir-gql for real.
 *
 * Diff strategy — each item is partitioned against the fhirIds that were present
 * when the form was loaded:
 *   - fhirId present in the current list        → UPDATE (doctor edited it)
 *   - fhirId absent from the current list       → CREATE (newly added item)
 *   - fhirId loaded at mount but missing now    → DELETE (doctor removed it)
 *
 * All operations for all four resource types run in a single Promise.all, so a
 * publish is one round of parallel writes rather than a sequential cascade.
 *
 * Immutability caveat (enforced by fhir-gql, mirrored here): child arrays such
 * as category, note, reference_range and dosage_instruction can only be set at
 * CREATE time. UPDATE payloads therefore carry scalar fields only — changing a
 * child array requires the doctor to delete and re-add the item.
 *
 * Shared by AppointmentReview (post-consultation review) and the Clinical
 * Records workspace so both publish through exactly one implementation.
 */

import {
  createConditionAction,
  updateConditionAction,
  deleteConditionAction,
} from "@/modules/server/presentation/actions/condition/core.actions";
import {
  createObservationAction,
  updateObservationAction,
  deleteObservationAction,
} from "@/modules/server/presentation/actions/observation/core.actions";
import {
  createMedicationRequestAction,
  updateMedicationRequestAction,
  deleteMedicationRequestAction,
} from "@/modules/server/presentation/actions/medication-request/core.actions";
import {
  createServiceRequestAction,
  updateServiceRequestAction,
  deleteServiceRequestAction,
} from "@/modules/server/presentation/actions/service-request/core.actions";
import { parseDuration } from "./fromFhir";
import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
} from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The set of FHIR IDs present per resource type when the form was loaded.
 * Anything in here but absent from the current lists is treated as a deletion.
 */
export interface InitialFhirIds {
  conditions: Set<number>;
  observations: Set<number>;
  medications: Set<number>;
  serviceRequests: Set<number>;
}

/** Everything publishClinicalRecords needs to diff and write one encounter's records. */
export interface PublishClinicalRecordsInput {
  /** Current condition form state. */
  conditions: ConditionFormItem[];
  /** Current observation form state. */
  observations: ObservationFormItem[];
  /** Current medication request form state. */
  medications: MedicationFormItem[];
  /** Current service request form state. */
  serviceRequests: ServiceRequestFormItem[];
  /** FHIR IDs present at load — used to compute deletions. */
  initialFhirIds: InitialFhirIds;
  /** FHIR subject reference for created resources, e.g. "Patient/10001". */
  subject: string;
  /** FHIR Encounter.id that every created resource is linked to. */
  encounterId: number;
}

// ── Publish ───────────────────────────────────────────────────────────────────

/**
 * Diffs the supplied form state against the FHIR IDs loaded at mount and applies
 * CREATE / UPDATE / DELETE operations in parallel across all four resource types.
 *
 * @param input - Current form state, load-time FHIR IDs, subject and encounter.
 * @returns The FHIR IDs still present after publishing, so the caller can reset
 *          its load-time snapshot without refetching.
 * @throws Whatever the underlying server actions throw if a write fails — the
 *         caller is responsible for surfacing the error to the doctor.
 */
export async function publishClinicalRecords({
  conditions,
  observations,
  medications,
  serviceRequests,
  initialFhirIds,
  subject,
  encounterId,
}: PublishClinicalRecordsInput): Promise<InitialFhirIds> {
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

  const deletedConditionIds = [...initialFhirIds.conditions].filter(
    (id) => !currentConditionFhirIds.has(id),
  );
  const deletedObservationIds = [...initialFhirIds.observations].filter(
    (id) => !currentObservationFhirIds.has(id),
  );
  const deletedMedicationIds = [...initialFhirIds.medications].filter(
    (id) => !currentMedicationFhirIds.has(id),
  );
  const deletedServiceRequestIds = [...initialFhirIds.serviceRequests].filter(
    (id) => !currentServiceRequestFhirIds.has(id),
  );

  await Promise.all([
    /* ══ Conditions ══════════════════════════════════════════════════════════ */

    /* DELETE removed conditions */
    ...deletedConditionIds.map((id) => deleteConditionAction({ payload: { id } })),

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
            ...(c.category ? { category: [{ coding_code: c.category }] } : {}),
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
            ...(o.category ? { category: [{ coding_code: o.category }] } : {}),
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
            dispense_number_of_repeats_allowed: m.dispenseRepeatsAllowed ?? undefined,
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
            dispense_number_of_repeats_allowed: m.dispenseRepeatsAllowed ?? undefined,
            dispense_quantity_value: m.dispenseQuantityValue
              ? parseFloat(m.dispenseQuantityValue)
              : undefined,
            dispense_quantity_unit: m.dispenseQuantityUnit ?? undefined,
            substitution_allowed_boolean: m.substitutionAllowed ?? undefined,
            dosage_instruction: [
              {
                text: m.editedDose ?? m.dose ?? undefined,
                route_display: m.editedRoute ?? m.route ?? undefined,
                timing_code_display: m.editedFrequency ?? m.frequency ?? undefined,
                patient_instruction: m.patientInstruction ?? undefined,
                ...(parsedDur
                  ? {
                      timing_repeat_duration: parsedDur.value,
                      timing_repeat_duration_unit: parsedDur.unit,
                    }
                  : {}),
              },
            ],
            ...(m.reasonCode ? { reason_code: [{ text: m.reasonCode }] } : {}),
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
            ...(s.reasonCode ? { reason_code: [{ text: s.reasonCode }] } : {}),
            ...(s.note ? { note: [{ text: s.note }] } : {}),
          },
        }),
      ),
  ]);

  /*
   * Return the surviving fhirIds so the caller can reset its load-time snapshot.
   * Newly CREATEd items are intentionally absent — they have no fhirId in local
   * state until the caller refetches, and re-publishing without a refetch would
   * simply create them again (same behaviour as before this was extracted).
   */
  return {
    conditions: currentConditionFhirIds,
    observations: currentObservationFhirIds,
    medications: currentMedicationFhirIds,
    serviceRequests: currentServiceRequestFhirIds,
  };
}
