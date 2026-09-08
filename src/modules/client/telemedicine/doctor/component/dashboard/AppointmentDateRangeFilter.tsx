/**
 * AppointmentDateRangeFilter — date-range picker for the doctor dashboard's
 * appointment list.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * A standalone value/onChange range picker (Calendar + Popover), independent
 * of the TanStack-Table-coupled DataTableDateFilter used by the full
 * appointments table elsewhere in the app — this one isn't bound to a table
 * column, just a plain react-day-picker DateRange, so it can drive a direct
 * server-action refetch instead of a client-side table filter.
 *
 * Includes quick presets (Today / This week / This month) since a doctor
 * switching ranges will usually want a common window rather than manually
 * picking two dates every time.
 */

"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentDateRangeFilterProps {
  /** Currently selected range — both ends are always set (no partial range is committed). */
  value: DateRange;
  /** Called with the newly picked range, from either a preset or a completed calendar selection. */
  onChange: (range: DateRange) => void;
}

// ── Presets ───────────────────────────────────────────────────────────────────

/** Unlike react-day-picker's DateRange, both ends are guaranteed set. */
type CompleteRange = { from: Date; to: Date };

const PRESETS: { label: string; getRange: () => CompleteRange }[] = [
  {
    label: "Today",
    getRange: () => ({ from: new Date(), to: new Date() }),
  },
  {
    label: "This week",
    getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }),
  },
  {
    label: "This month",
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True when both ends of the range fall on today's calendar date. */
export function isTodayRange(range: DateRange): boolean {
  return (
    !!range.from &&
    !!range.to &&
    isSameDay(range.from, new Date()) &&
    isSameDay(range.to, new Date())
  );
}

/** Formats a range for display: "Today", a single date, or "MMM d – MMM d, yyyy". */
export function formatRangeLabel(range: DateRange): string {
  if (isTodayRange(range)) return "Today";
  if (!range.from) return "Pick a date range";
  if (!range.to || isSameDay(range.from, range.to)) {
    return format(range.from, "MMM d, yyyy");
  }
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  return `${format(range.from, sameYear ? "MMM d" : "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Trigger button + popover (presets and a range calendar) for filtering the
 * dashboard's appointment list by date range.
 *
 * @param value - Currently selected range.
 * @param onChange - Called with the new range once one is committed.
 */
export function AppointmentDateRangeFilter({
  value,
  onChange,
}: AppointmentDateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs font-normal"
        >
          <CalendarIcon className="size-3.5" />
          {formatRangeLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-0.5 border-r p-2">
            {PRESETS.map((preset) => {
              const presetRange = preset.getRange();
              const active =
                !!value.from &&
                !!value.to &&
                isSameDay(value.from, presetRange.from) &&
                isSameDay(value.to, presetRange.to);
              return (
                <Button
                  key={preset.label}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start text-xs font-normal"
                  onClick={() => {
                    onChange(presetRange);
                    setOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
          <Calendar
            autoFocus
            captionLayout="dropdown"
            mode="range"
            selected={value}
            onSelect={(range) => {
              // Only commit once both ends are picked — an in-progress
              // single-end selection stays local to the calendar.
              if (range?.from && range?.to) {
                onChange({ from: range.from, to: range.to });
                setOpen(false);
              }
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
