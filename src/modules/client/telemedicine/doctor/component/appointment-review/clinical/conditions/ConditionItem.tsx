/**
 * ConditionItem — single condition card in the ClinicalExtractionPanel.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / conditions
 *
 * Shows the AI-extracted display name and system badge, a TerminologyCombobox to
 * resolve to a FHIR code, and ConceptSelect dropdowns for clinical status and
 * verification status. Doctors edit then remove if incorrect.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Sparkles } from "lucide-react";
import { TerminologyCombobox } from "../../shared/TerminologyCombobox";
import { ConceptSelect } from "../../shared/ConceptSelect";
import {
  TERMINOLOGY_SYSTEM_URL,
  CONDITION_CLINICAL_STATUS,
  CONDITION_VERIFICATION_STATUS,
  type ConditionFormItem,
} from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConditionItemProps {
  /** Current condition form item — controlled by ConditionList. */
  item: ConditionFormItem;
  /** Called when any field on this item changes. */
  onChange: (item: ConditionFormItem) => void;
  /** Called when the doctor removes this item. */
  onRemove: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Card-based editor for a single FHIR Condition.
 * Shows AI badge, terminology search, clinical status, and verification status.
 *
 * @param item - Condition form item (AI-suggested + optional doctor edits).
 * @param onChange - Setter receiving the full updated item.
 * @param onRemove - Called when the doctor clicks the delete button.
 */
export function ConditionItem({ item, onChange, onRemove }: ConditionItemProps) {
  const system =
    TERMINOLOGY_SYSTEM_URL[item.terminologySystem] ?? item.terminologySystem;

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* AI badge header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="secondary" className="gap-1 shrink-0 text-xs">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
            <span className="text-sm text-muted-foreground truncate">{item.display}</span>
            <Badge variant="outline" className="text-xs shrink-0 font-mono">
              {item.terminologySystem}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Terminology search */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Terminology Code ({item.terminologySystem})
          </Label>
          <TerminologyCombobox
            system={system}
            initialQuery={item.display}
            value={item.resolved ?? null}
            onChange={(concept) =>
              onChange({ ...item, resolved: concept ?? undefined })
            }
            placeholder={`Search ${item.terminologySystem}...`}
          />
        </div>

        {/* Clinical status + verification status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Clinical Status</Label>
            <ConceptSelect
              resource="Condition"
              field="clinicalStatus"
              value={item.clinicalStatus}
              onChange={(code) => onChange({ ...item, clinicalStatus: code })}
              placeholder="Select status"
              fallback={CONDITION_CLINICAL_STATUS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Verification</Label>
            <ConceptSelect
              resource="Condition"
              field="verificationStatus"
              value={item.verificationStatus}
              onChange={(code) => onChange({ ...item, verificationStatus: code })}
              placeholder="Select verification"
              fallback={CONDITION_VERIFICATION_STATUS}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
