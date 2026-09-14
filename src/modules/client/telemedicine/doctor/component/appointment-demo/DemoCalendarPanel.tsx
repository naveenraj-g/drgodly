/**
 * @file DemoCalendarPanel.tsx
 * @description "Calendar View" mini month-calendar for the appointment demo
 * page's right rail — a single-month picker with a small dot under days that
 * carry a real appointment for this practitioner, and a "Today" button that
 * jumps back to the actual current date.
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

"use client";

import { useState } from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DemoCalendarPanelProps {
  /** Real "today" (server-computed, so it matches the rest of the page). */
  today: Date;
  /** Dates within the initially-shown month that have at least one appointment. */
  highlightDates: Date[];
}

/**
 * Renders the demo page's mini calendar card.
 *
 * @param today - Real current date.
 * @param highlightDates - Dates to mark with a dot.
 */
export function DemoCalendarPanel({ today, highlightDates }: DemoCalendarPanelProps) {
  const [selected, setSelected] = useState<Date>(today);
  const [month, setMonth] = useState<Date>(today);

  return (
    <Card className="p-3 gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Calendar View</h2>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => {
            setSelected(today);
            setMonth(today);
          }}
        >
          Today
        </Button>
      </div>

      <Calendar
        mode="single"
        selected={selected}
        onSelect={(date) => date && setSelected(date)}
        month={month}
        onMonthChange={setMonth}
        modifiers={{ hasAppointment: highlightDates }}
        className="p-0 mx-auto"
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
