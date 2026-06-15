/**
 * ObservationItem — single observation card in the ClinicalExtractionPanel.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / clinical / observations
 *
 * Shows AI badge, terminology combobox, editable value/unit inputs, and status select.
 * Doctors can correct the AI-extracted value, unit, and FHIR code.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Sparkles } from "lucide-react";
import { TerminologyCombobox } from "../../shared/TerminologyCombobox";
import { ConceptSelect } from "../../shared/ConceptSelect";
import {
  TERMINOLOGY_SYSTEM_URL,
  OBSERVATION_STATUS,
  type ObservationFormItem,
} from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ObservationItemProps {
  /** Current observation form item — controlled by ObservationList. */
  item: ObservationFormItem;
  /** Called when any field on this item changes. */
  onChange: (item: ObservationFormItem) => void;
  /** Called when the doctor removes this item. */
  onRemove: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Card-based editor for a single FHIR Observation.
 * Shows AI badge, terminology search, value/unit inputs, and status select.
 *
 * @param item - Observation form item (AI-suggested + optional doctor edits).
 * @param onChange - Setter receiving the full updated item.
 * @param onRemove - Called when the doctor clicks the delete button.
 */
export function ObservationItem({ item, onChange, onRemove }: ObservationItemProps) {
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

        {/* Value + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Value</Label>
            <Input
              value={item.editedValue ?? item.value ?? ""}
              onChange={(e) => onChange({ ...item, editedValue: e.target.value })}
              placeholder="e.g. 101.2"
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Unit</Label>
            <Input
              value={item.editedUnit ?? item.unit ?? ""}
              onChange={(e) => onChange({ ...item, editedUnit: e.target.value })}
              placeholder="e.g. F"
              className="text-sm h-9"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <ConceptSelect
            resource="Observation"
            field="status"
            value={item.status}
            onChange={(code) => onChange({ ...item, status: code })}
            placeholder="Select status"
            fallback={OBSERVATION_STATUS}
          />
        </div>
      </CardContent>
    </Card>
  );
}
