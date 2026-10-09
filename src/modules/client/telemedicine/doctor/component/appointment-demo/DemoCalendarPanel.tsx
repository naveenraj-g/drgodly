/**
 * @file DemoCalendarPanel.tsx
 * @description "Calendar View" mini month-calendar for the doctor
 * appointments page's right rail — a range picker (matching each tab's own "Date" column
 * filter, which is also a range) with a small dot under days that carry a
 * real appointment for this practitioner, a "Today" button that jumps to
 * and selects the current date, and a "Clear" button that drops the picked
 * range entirely. Fully controlled by the parent (AppointmentDemo): picking
 * a range or changing month both need a network refetch (highlight dots for
 * the shown month, or the active tab's list for the picked range), and the
 * range is two-way synced with that tab's own column filter, so none of it
 * can live locally here.
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

"use client";

import type { DateRange } from "react-day-picker";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DemoCalendarPanelProps {
  /** Real "today" (server-computed, so it matches the rest of the page). */
  today: Date;
  /** Dates within the shown month that have at least one appointment. */
  highlightDates: Date[];
  /** Month currently displayed by the calendar grid. */
  month: Date;
  /** Fired when the doctor navigates to a different month. */
  onMonthChange: (month: Date) => void;
  /**
   * The picked range, or null if nothing's picked (in which case the active
   * tab's own default applies). Kept in sync with that tab's "Time" column
   * filter — set from either side, mirrored to the other.
   */
  range: DateRange | null;
  /** Fired when the doctor picks/changes/clears a range. */
  onRangeChange: (range: DateRange | null) => void;
}

/**
 * Renders the appointments page's mini calendar card.
 *
 * @param today - Real current date.
 * @param highlightDates - Dates to mark with a dot.
 * @param month - Month currently shown.
 * @param onMonthChange - Month-navigation callback.
 * @param range - Currently-picked range, if any.
 * @param onRangeChange - Pick/change/clear callback.
 */
export function DemoCalendarPanel({
  today,
  highlightDates,
  month,
  onMonthChange,
  range,
  onRangeChange,
}: DemoCalendarPanelProps) {
  const hasRange = !!(range?.from || range?.to);

  return (
    <Card className="p-3 gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Calendar View</h2>
        <div className="flex items-center gap-1.5">
          {hasRange && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => onRangeChange(null)}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={() => {
              onRangeChange({ from: today, to: today });
              onMonthChange(today);
            }}
          >
            Today
          </Button>
        </div>
      </div>

      <Calendar
        mode="range"
        selected={range ?? undefined}
        onSelect={(next) => onRangeChange(next ?? null)}
        month={month}
        onMonthChange={onMonthChange}
        modifiers={{ hasAppointment: highlightDates }}
        // Calendar paints its own bg-background by default (only made
        // transparent automatically when nested in a CardContent/Popover —
        // this one sits directly in a bare Card instead), which is a
        // visibly different shade than the Card's own bg-card in dark mode
        // (--background is darker than --card here), showing up as a seam
        // around the grid. Force it transparent so it just shows the Card's
        // background like every other themed surface on this page.
        className="p-0 mx-auto bg-transparent"
        components={{
          DayButton: (props) => (
            <div className="relative">
              <CalendarDayButton {...props} />
              {props.modifiers.hasAppointment && !props.modifiers.selected && (
                <span className="pointer-events-none absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </div>
          ),
        }}
      />
    </Card>
  );
}
