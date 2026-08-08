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
   * Appointment IDs that have at least one Encounter — only these can open the
   * clinical workspace, since every clinical resource is linked to an encounter.
   */
  appointmentIdsWithEncounter: number[];
  /** Base href for the clinical workspace, e.g. ".../clinical-records/10023". */
  workspaceBaseHref: string;
  /** Base href for the read-only appointment detail page. */
  appointmentBaseHref: string;
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface AppointmentCardProps {
  appointment: TAppointmentResponse;
  /** Whether an Encounter exists — gates the clinical workspace link. */
  hasEncounter: boolean;
  workspaceBaseHref: string;
  appointmentBaseHref: string;
}

/**
 * One appointment row. Links to the clinical workspace when an encounter exists,
 * otherwise to the read-only detail page with an explanatory hint.
 *
 * @param appointment - The appointment to render.
 * @param hasEncounter - Whether a clinical record can be opened for it.
 * @param workspaceBaseHref - Base path for the workspace route.
 * @param appointmentBaseHref - Base path for the read-only detail route.
 */
function AppointmentCard({
  appointment,
  hasEncounter,
  workspaceBaseHref,
  appointmentBaseHref,
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

  const href = hasEncounter
    ? `${workspaceBaseHref}/${appointment.id}`
    : `${appointmentBaseHref}/${appointment.id}`;

  return (
    <Card
      className={
        hasEncounter
          ? "transition-colors hover:border-primary/50 hover:bg-muted/30"
          : "transition-colors hover:bg-muted/20"
      }
    >
      <Link href={href} className="block">
        <CardContent className="px-4 py-3 flex items-start gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Date — primary identifier */}
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <CalendarDays className="size-3.5 text-primary shrink-0" />
              {fmtDate(appointment.start)}
            </div>

            {/* Time + duration */}
            {(startTime ?? duration) && (
              <div className="flex items-center gap-3 flex-wrap">
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

            {/* Appointment type */}
            {apptType && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Stethoscope className="size-3 shrink-0" />
                {apptType}
              </div>
            )}

            {/* Clinical record availability */}
            <div className="flex items-center gap-1.5 text-xs">
              {hasEncounter ? (
                <span className="flex items-center gap-1.5 font-medium text-primary">
                  <ClipboardList className="size-3 shrink-0" />
                  Open clinical record
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground/70">
                  <FileClock className="size-3 shrink-0" />
                  Consultation not completed — no clinical record yet
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <Badge
              variant={STATUS_VARIANT[status] ?? "outline"}
              className="text-xs font-normal capitalize"
            >
              {status}
            </Badge>
            <ChevronRight className="size-4 text-muted-foreground" />
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
 * @param workspaceBaseHref - Base path for the clinical workspace.
 * @param appointmentBaseHref - Base path for read-only appointment detail.
 */
export function PatientAppointmentList({
  upcoming,
  past,
  appointmentIdsWithEncounter,
  workspaceBaseHref,
  appointmentBaseHref,
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
        <div className="space-y-3">
          {rows.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              hasEncounter={encounterIds.has(appt.id)}
              workspaceBaseHref={workspaceBaseHref}
              appointmentBaseHref={appointmentBaseHref}
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
