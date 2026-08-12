/**
 * DiagnosesTab — diagnoses and findings for the visit.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Two ClinicalEntryList sections. Both are fully controlled — this tab holds no
 * state; ClinicalWorkspace owns it so the staging autosave sees every edit.
 */

"use client";

import { Activity, AlertCircle } from "lucide-react";

import { ClinicalEntryList } from "../entries/ClinicalEntryList";
import { ConditionFields } from "../entries/fields/ConditionFields";
import { ObservationFields } from "../entries/fields/ObservationFields";
import { conditionSummary, observationSummary } from "../entries/summaries";
import type {
  ConditionFormItem,
  ObservationFormItem,
} from "../../appointment-review/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagnosesTabProps {
  /** Current condition items. */
  conditions: ConditionFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onConditionsChange: (items: ConditionFormItem[]) => void;
  /** Current observation items. */
  observations: ObservationFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onObservationsChange: (items: ObservationFormItem[]) => void;
}

// ── Blank-entry factories ─────────────────────────────────────────────────────

/** Creates a blank diagnosis. SNOMED is the default system for conditions. */
function emptyCondition(): ConditionFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "SNOMED",
    clinicalStatus: "active",
    verificationStatus: "confirmed",
  };
}

/** Creates a blank finding. LOINC is the default system for observations. */
function emptyObservation(): ObservationFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "LOINC",
    value: null,
    unit: null,
    status: "final",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Diagnoses and findings sections.
 *
 * @param conditions - Current condition items.
 * @param onConditionsChange - Condition list change handler.
 * @param observations - Current observation items.
 * @param onObservationsChange - Observation list change handler.
 */
export function DiagnosesTab({
  conditions,
  onConditionsChange,
  observations,
  onObservationsChange,
}: DiagnosesTabProps) {
  return (
    <div className="space-y-5">
      <ClinicalEntryList
        items={conditions}
        onChange={onConditionsChange}
        icon={AlertCircle}
        title="Diagnoses"
        addLabel="Add diagnosis"
        emptyLabel="No diagnoses recorded for this visit."
        hint="Each entry needs a terminology code"
        createItem={emptyCondition}
        summary={conditionSummary}
        renderFields={(item, onItemChange) => (
          <ConditionFields item={item} onChange={onItemChange} />
        )}
      />

      <ClinicalEntryList
        items={observations}
        onChange={onObservationsChange}
        icon={Activity}
        title="Findings & Vitals"
        addLabel="Add finding"
        emptyLabel="No findings recorded for this visit."
        hint="Numeric values store as quantities"
        createItem={emptyObservation}
        summary={observationSummary}
        renderFields={(item, onItemChange) => (
          <ObservationFields item={item} onChange={onItemChange} />
        )}
      />
    </div>
  );
}
