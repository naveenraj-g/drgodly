/**
 * ClinicalEntryList — compact scannable list of clinical entries with a
 * click-through detail drawer.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * Replaces the review page's flat-card editors, which rendered every field of
 * every entry at once (a MedicationItem shows ~15 fields, so a five-drug visit
 * was a multi-thousand-pixel scroll with nothing scannable). Here each entry is
 * one row — name, coding status, and a summary of the values that identify it —
 * and the full field set opens in a side drawer.
 *
 * Generic over the four clinical form-item types: the caller supplies how to
 * create a blank item, how to summarise one, and which fields to render in the
 * drawer. The list itself owns only which row is open.
 *
 * Fully controlled — every mutation goes out through `onChange` so the
 * workspace's staging autosave sees it.
 */

"use client";

import { useState } from "react";
import { Plus, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClinicalEntryDrawer } from "./ClinicalEntryDrawer";
import { ClinicalEntryRow } from "./ClinicalEntryRow";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The fields every clinical form item shares. The four concrete types
 * (ConditionFormItem, ObservationFormItem, …) all satisfy this.
 */
export interface ClinicalEntryBase {
  /** Stable list key — a UUID for new items, the FHIR id for saved ones. */
  id: string;
  /** Human-readable name shown as the row title. */
  display: string;
  /** Short terminology system name, e.g. "SNOMED". */
  terminologySystem: string;
  /** Present once the entry has been published to the EMR. */
  fhirId?: number;
  /** Set once a terminology code has been resolved for the entry. */
  resolved?: { code: string; system: string; display: string; text: string };
}

interface ClinicalEntryListProps<T extends ClinicalEntryBase> {
  /** Current entries — controlled by the workspace. */
  items: T[];
  /** Called with the full updated list on any add, edit or remove. */
  onChange: (items: T[]) => void;
  /** Section icon. */
  icon: LucideIcon;
  /** Section title, e.g. "Prescriptions". */
  title: string;
  /** Label for the add button, e.g. "Add medication". */
  addLabel: string;
  /** Message shown when the list is empty. */
  emptyLabel: string;
  /** Creates a blank entry when the doctor clicks add. */
  createItem: () => T;
  /** Builds the one-line summary shown beneath each row title. */
  summary: (item: T) => string;
  /** Renders the drawer body for one entry. */
  renderFields: (item: T, onItemChange: (item: T) => void) => React.ReactNode;
  /** Optional hint shown in the section header. */
  hint?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Section of clinical entries as compact rows, editable via a detail drawer.
 *
 * @param props - See ClinicalEntryListProps.
 */
export function ClinicalEntryList<T extends ClinicalEntryBase>({
  items,
  onChange,
  icon: Icon,
  title,
  addLabel,
  emptyLabel,
  createItem,
  summary,
  renderFields,
  hint,
}: ClinicalEntryListProps<T>) {
  /** Id of the entry currently open in the drawer, or null when closed. */
  const [openId, setOpenId] = useState<string | null>(null);

  const openItem = items.find((i) => i.id === openId) ?? null;

  /** Appends a blank entry and opens it immediately for editing. */
  function handleAdd() {
    const item = createItem();
    onChange([...items, item]);
    setOpenId(item.id);
  }

  /** Replaces one entry in place, preserving list order. */
  function handleItemChange(next: T) {
    onChange(items.map((i) => (i.id === next.id ? next : i)));
  }

  /** Removes an entry and closes the drawer if it was the one open. */
  function handleRemove(id: string) {
    onChange(items.filter((i) => i.id !== id));
    if (openId === id) setOpenId(null);
  }

  return (
    <Card>
      <CardContent className="px-4 py-3.5 space-y-3">
        {/* ── Section header ── */}
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary shrink-0" />
          <p className="text-sm font-semibold">{title}</p>
          <Badge variant="secondary" className="text-xs font-normal">
            {items.length}
          </Badge>

          {hint && (
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">
              {hint}
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 text-xs shrink-0"
            onClick={handleAdd}
          >
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        </div>

        <Separator />

        {/* ── Rows ── */}
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {items.map((item) => (
              <ClinicalEntryRow
                key={item.id}
                title={item.display}
                summary={summary(item)}
                terminologySystem={item.terminologySystem}
                isCoded={Boolean(item.resolved?.code)}
                isPublished={item.fhirId != null}
                onOpen={() => setOpenId(item.id)}
                onRemove={() => handleRemove(item.id)}
              />
            ))}
          </div>
        )}

        {/* Affordance repeated at the bottom for long lists */}
        {items.length > 3 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-muted-foreground"
            onClick={handleAdd}
          >
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        )}
      </CardContent>

      {/* ── Detail drawer ── */}
      <ClinicalEntryDrawer
        open={openItem !== null}
        title={openItem?.display || title}
        isPublished={openItem?.fhirId != null}
        onClose={() => setOpenId(null)}
        onRemove={openItem ? () => handleRemove(openItem.id) : undefined}
      >
        {openItem ? renderFields(openItem, handleItemChange) : null}
      </ClinicalEntryDrawer>
    </Card>
  );
}
