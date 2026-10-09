/**
 * VitalsDateRangeFilter — preset + custom date-range picker for the patient
 * vitals page.
 *
 * Layer: client / telemedicine / patient / component / vitals
 *
 * Presets (Today / This Week / This Month) compute IST calendar boundaries
 * via the shared startOf/endOf IST helpers, so "today" always means the
 * same calendar day a patient in India would expect, regardless of the
 * server's or browser's own timezone. Custom opens a range calendar.
 *
 * Purely a controlled input — the parent owns the actual date-range state
 * and re-fetches vitals/re-renders charts whenever it changes.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  formatDisplayDate,
  nowIST,
  startOfDayIST,
  endOfDayIST,
  startOfWeekIST,
  endOfWeekIST,
  startOfMonthIST,
  endOfMonthIST,
} from "@/modules/shared/helper";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A resolved date-range filter value, as real UTC instants ready for the API. */
export interface VitalsDateRange {
  from: Date;
  to: Date;
}

export type VitalsDatePreset = "today" | "week" | "month" | "custom";

interface VitalsDateRangeFilterProps {
  /** Which preset is currently active — drives the pressed button state. */
  preset: VitalsDatePreset;
  /** The resolved range currently in effect (used to seed the custom picker). */
  range: VitalsDateRange;
  /** Called with the new preset and its resolved range whenever the selection changes. */
  onChange: (preset: VitalsDatePreset, range: VitalsDateRange) => void;
}

// ── Preset resolution ─────────────────────────────────────────────────────────

/**
 * Resolves a preset key into a concrete { from, to } range, anchored to the
 * current IST calendar day.
 *
 * @param preset - Which preset to resolve.
 */
export function resolvePreset(preset: "today" | "week" | "month"): VitalsDateRange {
  const now = new Date();
  if (preset === "today") return { from: startOfDayIST(now), to: endOfDayIST(now) };
  if (preset === "week") return { from: startOfWeekIST(now), to: endOfWeekIST(now) };
  return { from: startOfMonthIST(now), to: endOfMonthIST(now) };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Preset buttons (Today / This Week / This Month) plus a custom date-range
 * popover calendar.
 *
 * @param preset - Currently active preset.
 * @param range - Currently resolved range (seeds the custom calendar).
 * @param onChange - Fired with the new preset + resolved range on any change.
 */
export function VitalsDateRangeFilter({
  preset,
  range,
  onChange,
}: VitalsDateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  // Local draft so picking only the "from" day of a range doesn't yet fire
  // onChange with a half-open range — committed once both ends are picked.
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: range.from,
    to: range.to,
  });

  const presetButton = (key: "today" | "week" | "month", label: string) => (
    <Button
      key={key}
      size="sm"
      variant={preset === key ? "default" : "outline"}
      className="h-8 px-3 text-xs"
      onClick={() => onChange(key, resolvePreset(key))}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presetButton("today", "Today")}
      {presetButton("week", "This Week")}
      {presetButton("month", "This Month")}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Reset the draft to the committed range whenever the popover
          // reopens, so a previously abandoned in-progress pick doesn't linger.
          if (next) setDraft({ from: range.from, to: range.to });
        }}
      >
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={preset === "custom" ? "default" : "outline"}
            className="h-8 gap-1.5 px-3 text-xs"
          >
            <CalendarIcon className="size-3.5" />
            {preset === "custom"
              ? `${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)}`
              : "Custom range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={draft?.from ?? nowIST()}
            selected={draft}
            onSelect={(next) => {
              setDraft(next);
              if (next?.from && next?.to) {
                onChange("custom", {
                  from: startOfDayIST(next.from),
                  to: endOfDayIST(next.to),
                });
                setOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
