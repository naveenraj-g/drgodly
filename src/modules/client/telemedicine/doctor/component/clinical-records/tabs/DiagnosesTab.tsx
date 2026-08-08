/**
 * DiagnosesTab — Conditions and Observations for the visit.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Wraps the existing ConditionList / ObservationList editors from the
 * post-consultation review in section cards. Both are fully controlled — this
 * tab holds no state of its own; ClinicalWorkspace owns it so the draft
 * autosave sees every keystroke.
 */

"use client";

import { Activity, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConditionList } from "../../appointment-review/clinical/conditions/ConditionList";
import { ObservationList } from "../../appointment-review/clinical/observations/ObservationList";
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

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the Conditions and Observations editors as two sections.
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
      {/* ── Conditions ── */}
      <Card>
        <CardContent className="px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-primary" />
            <p className="text-sm font-semibold">Diagnoses</p>
            <Badge variant="secondary" className="text-xs font-normal">
              {conditions.length}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              Confirm a terminology code for each entry
            </span>
          </div>
          <Separator />
          <ConditionList items={conditions} onChange={onConditionsChange} />
        </CardContent>
      </Card>

      {/* ── Observations ── */}
      <Card>
        <CardContent className="px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <p className="text-sm font-semibold">Findings &amp; Vitals</p>
            <Badge variant="secondary" className="text-xs font-normal">
              {observations.length}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              Numeric values are stored as quantities, text as strings
            </span>
          </div>
          <Separator />
          <ObservationList items={observations} onChange={onObservationsChange} />
        </CardContent>
      </Card>
    </div>
  );
}
