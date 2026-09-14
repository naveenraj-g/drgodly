/**
 * PracticeProfileCard — doctor's own PractitionerRole summary card for the
 * practice-overview dashboard.
 *
 * Layer: client / telemedicine / doctor / component / dashboard-overview
 *
 * Shows specialty, active/inactive status, and which days of the week the
 * doctor has declared availability on — read straight off the
 * PractitionerRole's own `availability[].available_times[].days_of_week`
 * data, the same field the booking wizard's calendar hint already reads
 * (BookAppointment.tsx). No separate fetch of slot data needed.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CalendarCheck2, Stethoscope } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PracticeProfileCardProps {
  /** Practice specialty label(s), e.g. ["Cardiology"]. Empty if none declared. */
  specialties: string[];
  /** Whether the PractitionerRole is currently active. */
  active: boolean | null;
  /** Lowercase 3-letter weekday codes with declared availability, e.g. {"mon","wed"}. */
  availableDays: Set<string>;
  /** Link to the doctor's profile settings page for editing. */
  editHref: string;
}

// ── Weekday chips ─────────────────────────────────────────────────────────────

/** FHIR R4 DaysOfWeek codes in display order, paired with a single-letter label. */
const WEEKDAYS: { code: string; label: string }[] = [
  { code: "sun", label: "S" },
  { code: "mon", label: "M" },
  { code: "tue", label: "T" },
  { code: "wed", label: "W" },
  { code: "thu", label: "T" },
  { code: "fri", label: "F" },
  { code: "sat", label: "S" },
];

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the doctor's specialty, active status, and weekly availability chips.
 *
 * @param specialties - Specialty display labels.
 * @param active - PractitionerRole active flag.
 * @param availableDays - Set of weekday codes with declared availability.
 * @param editHref - Link to the profile settings page.
 */
export function PracticeProfileCard({
  specialties,
  active,
  availableDays,
  editHref,
}: PracticeProfileCardProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-1.5">
          <Stethoscope className="size-4 text-muted-foreground" />
          Practice Profile
        </h2>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-xs h-auto p-0 font-normal opacity-70 hover:opacity-100 hover:bg-transparent hover:underline"
        >
          <Link href={editHref}>Edit</Link>
        </Button>
      </div>

      {/* Specialty + active status */}
      <div className="flex flex-wrap items-center gap-1.5">
        {specialties.length > 0 ? (
          specialties.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {s}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">
            No specialty on file
          </span>
        )}
        <Badge
          variant="outline"
          className={cn(
            "text-xs ml-auto",
            active
              ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-600"
              : "border-gray-500/20 bg-gray-500/10 text-gray-500",
          )}
        >
          {active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Weekly availability */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <CalendarCheck2 className="size-3.5" />
          Weekly Availability
        </p>
        {availableDays.size === 0 ? (
          <p className="text-xs text-muted-foreground">
            No availability declared yet.
          </p>
        ) : (
          <div className="flex gap-1.5">
            {WEEKDAYS.map(({ code, label }) => {
              const isAvailable = availableDays.has(code);
              return (
                <div
                  key={code}
                  title={code}
                  className={cn(
                    "flex-1 h-8 rounded-md flex items-center justify-center text-xs font-semibold",
                    isAvailable
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground/50",
                  )}
                >
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
