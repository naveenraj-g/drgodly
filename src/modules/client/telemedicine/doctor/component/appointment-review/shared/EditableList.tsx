/**
 * EditableList — controlled list of freetext string inputs with add/remove.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / shared
 *
 * Used in all four SOAP accordion sections (symptoms, findings, conditions, steps).
 * The parent owns the string[] state and receives updates via onChange.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditableListProps {
  /** Current list of string items — controlled by parent. */
  items: string[];
  /** Called whenever items change (add, edit, or remove). */
  onChange: (items: string[]) => void;
  /** Placeholder text for each input field. */
  placeholder?: string;
  /** Label on the "Add" button. */
  addLabel?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a list of text inputs with add and remove controls.
 * Each item maps to one Input + ghost delete button row.
 *
 * @param items - Controlled array of strings.
 * @param onChange - Parent setter — receives the full new array.
 * @param placeholder - Input placeholder text.
 * @param addLabel - Text shown on the add button.
 */
export function EditableList({
  items,
  onChange,
  placeholder = "Add item...",
  addLabel = "Add",
}: EditableListProps) {
  const update = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const add = () => onChange([...items, ""]);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-8 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground h-7 text-xs px-1"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
