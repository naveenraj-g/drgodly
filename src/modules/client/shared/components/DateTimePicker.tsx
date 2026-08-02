/**
 * DateTimePicker — shadcn Popover + Calendar date picker paired with a native
 * time input, producing/consuming the same "yyyy-MM-ddTHH:mm" string shape as
 * a native <input type="datetime-local">.
 *
 * Layer: client / shared / components
 *
 * Exists for fields that need a full datetime value but also need day
 * selection constrained to a range (e.g. Slot generation windows, which must
 * fall within their Schedule's planning horizon) — a plain datetime-local
 * input has no way to grey out or block days outside a min/max range on its
 * own. `minDate`/`maxDate` bound both calendar navigation and day selection,
 * mirroring the disabled-matcher approach used by the A2UI DatePicker
 * catalog component (`ai-hub/a2ui/catalog/DatePicker.tsx`).
 */

"use client";

import { useMemo, useState } from "react";
import { format, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateTimePickerProps {
  /** Current value as "yyyy-MM-ddTHH:mm" (native datetime-local shape), or empty/undefined for none. */
  value?: string;
  /** Called with the new "yyyy-MM-ddTHH:mm" string, or undefined when cleared. */
  onChange: (value: string | undefined) => void;
  /** Earliest selectable day. Days before this are greyed out and unclickable. */
  minDate?: Date;
  /** Latest selectable day. Days after this are greyed out and unclickable. */
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Splits a "yyyy-MM-ddTHH:mm" string into its Date (day-only) and "HH:mm" time parts. */
function parseValue(raw?: string): { date: Date | undefined; time: string } {
  if (!raw) return { date: undefined, time: "" };
  const d = new Date(raw);
  if (!isValid(d)) return { date: undefined, time: "" };
  return { date: d, time: format(d, "HH:mm") };
}

/** Combines a calendar day with an "HH:mm" string into a "yyyy-MM-ddTHH:mm" value. */
function combine(date: Date, time: string): string {
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours || 0, minutes || 0, 0, 0);
  return format(combined, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Date + time picker with min/max day constraints.
 *
 * @param props - See DateTimePickerProps.
 */
export function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Pick date & time",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const { date, time } = useMemo(() => parseValue(value), [value]);

  const disabledMatchers = useMemo<Matcher[]>(() => {
    const matchers: Matcher[] = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers;
  }, [minDate, maxDate]);

  function handleDateSelect(day: Date | undefined) {
    if (!day) return;
    onChange(combine(day, time));
  }

  function handleTimeChange(newTime: string) {
    onChange(combine(date ?? new Date(), newTime));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, "PPP") + (time ? ` ${time}` : "") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={disabledMatchers}
          startMonth={minDate}
          endMonth={maxDate}
          captionLayout="dropdown"
          autoFocus
        />
        <div className="border-t p-3">
          <Input
            type="time"
            value={time}
            onChange={(ev) => handleTimeChange(ev.target.value)}
            disabled={!date}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
