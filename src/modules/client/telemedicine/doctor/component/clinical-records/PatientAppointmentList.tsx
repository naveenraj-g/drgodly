/**
 * PatientAppointmentList — step 2 of the doctor's Clinical Records drill-down.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Lists every appointment this doctor has with the selected patient, split into
 * Upcoming and Past. Every appointment is shown for context, but the clinical
 * record editor is gated: only appointments whose consultation actually produced
 * an Encounter can be opened in the workspace. The rest link to the existing
 * read-only appointment detail page instead.
 *
 * Card layout follows the patient-side MedicalRecordsClient appointment picker
 * so both sides of the product read the same way.
 *
 * Pure presentational server component — navigation is plain <Link>s, so there
 * is no client state here (and the upcoming/past split can read the clock).
 */

import Link from "next/link";
import {
  CalendarDays,
  CalendarOff,
  ChevronRight,
  ClipboardList,
  Clock,
  FileClock,
  Stethoscope,
  Timer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO datetime as a short locale date, e.g. "5 Jan 2026".
 * @param iso - ISO 8601 string.
 */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Formats an ISO datetime as a 12-hour clock time, e.g. "10:30 AM".
 * @param iso - ISO 8601 string.
 */
function fmtTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * Derives a human-readable duration from start/end or minutes_duration.
 *
 * @param start - ISO start datetime.
 * @param end - ISO end datetime.
 * @param minutesDuration - Explicit duration in minutes (fallback when end is absent).
 * @returns e.g. "30 min" / "1 hr 15 min", or null when indeterminable.
 */
function fmtDuration(
  start: string | null | undefined,
  end: string | null | undefined,
  minutesDuration: number | null | undefined,
): string | null {
  let mins: number | null = null;

  if (start && end) {
    try {
      mins = Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) / 60000,
      );
    } catch {
      /* unparseable dates — fall through to minutesDuration */
    }
  }

  if (mins == null && minutesDuration != null) mins = minutesDuration;
  if (mins == null || mins <= 0) return null;

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/** Maps an appointment status to a badge variant for at-a-glance scanning. */
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  fulfilled: "secondary",
  "checked-in": "secondary",
  booked: "default",
  pending: "outline",
  proposed: "outline",
  arrived: "default",
  waitlist: "outline",
  cancelled: "destructive",
  noshow: "destructive",
  "entered-in-error": "destructive",
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatientAppointmentListProps {
  /** Future appointments, sorted soonest-first (split server-side). */
  upcoming: TAppointmentResponse[];
  /** Past appointments, sorted newest-first (split server-side). */
  past: TAppointmentResponse[];
  /**
   * Appointment IDs that have at least one Encounter. Drives the row's hint —
   * every row links into the workspace route either way, which renders the
   * read-only visit view when there is no encounter to document against.
   */
  appointmentIdsWithEncounter: number[];
  /** Base href for the clinical workspace, e.g. ".../clinical-records/10023". */
  workspaceBaseHref: string;
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface AppointmentCardProps {
  appointment: TAppointmentResponse;
  /** Whether an Encounter exists — drives the row's hint, not its destination. */
  hasEncounter: boolean;
  workspaceBaseHref: string;
}

/**
 * One appointment row. Always links into the Clinical Records route; that route
 * decides whether to show the editable workspace or the read-only visit view,
 * so the doctor never leaves the section mid-drill-down.
 *
 * @param appointment - The appointment to render.
 * @param hasEncounter - Whether a clinical record exists for it.
 * @param workspaceBaseHref - Base path for the route.
 */
function AppointmentCard({
  appointment,
  hasEncounter,
  workspaceBaseHref,
}: AppointmentCardProps) {
  const startTime = fmtTime(appointment.start);
  const endTime = fmtTime(appointment.end);
  const duration = fmtDuration(
    appointment.start,
    appointment.end,
    appointment.minutes_duration,
  );
  const apptType =
    appointment.appointment_type_display ??
    appointment.appointment_type_text ??
    null;
  const status = appointment.status ?? "unknown";

  const href = `${workspaceBaseHref}/${appointment.id}`;

  return (
    <Card
      className={
        hasEncounter
          ? "h-full transition-colors hover:border-primary/50 hover:bg-muted/30"
          : "h-full transition-colors hover:bg-muted/20"
      }
    >
      {/* h-full on both card and link so cards in a grid row match height */}
      <Link href={href} className="block h-full">
        <CardContent className="flex h-full flex-col gap-2.5 px-4 py-3">
          {/* ── Date + status ── */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
              <CalendarDays className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{fmtDate(appointment.start)}</span>
            </div>
            <Badge
              variant={STATUS_VARIANT[status] ?? "outline"}
              className="shrink-0 text-xs font-normal capitalize"
            >
              {status}
            </Badge>
          </div>

          {/* ── Time + duration ── */}
          {(startTime ?? duration) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {startTime && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3 shrink-0" />
                  {endTime ? `${startTime} – ${endTime}` : startTime}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="size-3 shrink-0" />
                  {duration}
                </span>
              )}
            </div>
          )}

          {/* ── Appointment type ── */}
          {apptType && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Stethoscope className="size-3 shrink-0" />
              <span className="truncate">{apptType}</span>
            </div>
          )}

          {/* ── Footer: record availability — mt-auto pins it to the card bottom
                 so the call to action lines up across a row ── */}
          <div className="mt-auto flex items-center gap-1.5 border-t pt-2.5 text-xs">
            {hasEncounter ? (
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-primary">
                <ClipboardList className="size-3 shrink-0" />
                <span className="truncate">Open clinical record</span>
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground/70">
                <FileClock className="size-3 shrink-0" />
                <span className="truncate">View visit details</span>
              </span>
            )}
            <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the patient's appointments as Upcoming and Past sections.
 *
 * @param upcoming - Future appointments, soonest-first.
 * @param past - Past appointments, newest-first.
 * @param appointmentIdsWithEncounter - IDs that have a clinical record.
 * @param workspaceBaseHref - Base path for the Clinical Records route.
 */
export function PatientAppointmentList({
  upcoming,
  past,
  appointmentIdsWithEncounter,
  workspaceBaseHref,
}: PatientAppointmentListProps) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <CalendarOff className="size-10 opacity-30" />
        <p className="text-sm font-medium">No appointments with this patient.</p>
      </div>
    );
  }

  const encounterIds = new Set(appointmentIdsWithEncounter);

  /**
   * Renders one titled section of appointment cards.
   *
   * @param title - Section heading.
   * @param rows - Appointments belonging to the section.
   */
  const renderSection = (title: string, rows: TAppointmentResponse[]) =>
    rows.length > 0 ? (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title} ({rows.length})
        </p>
        {/* One column on phones, two from sm, three on wide screens — the cards
            carry little enough text to stay readable at a third of the width. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              hasEncounter={encounterIds.has(appt.id)}
              workspaceBaseHref={workspaceBaseHref}
            />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {renderSection("Upcoming", upcoming)}
      {renderSection("Past", past)}
    </div>
  );
}
