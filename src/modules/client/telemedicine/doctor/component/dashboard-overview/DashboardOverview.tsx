/**
 * DashboardOverview — the doctor's practice-overview analytics page.
 *
 * Layer: client / telemedicine / doctor / component / dashboard-overview
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/dashboard
 *
 * Distinct from DoctorDashboard.tsx (the root `/doctor` schedule + selected-
 * appointment detail view) — this page is a practice-wide analytics
 * snapshot: stat cards, an appointment volume trend, a status breakdown,
 * a practice profile card, organisation-wide AI activity, and a recent
 * appointments table.
 *
 * All appointment-derived data comes from a single SSR fetch
 * (`listAppointmentsAction({ practitioner_id, limit: 200 })`, passed in as
 * the `appointments` prop) and is aggregated client-side — same
 * "one fetch, derive everything" pattern PatientDashboard.tsx already uses.
 * Practice profile and org-activity data are pre-aggregated server-side in
 * page.tsx since they come from three separate resources.
 */

"use client";

import { useMemo } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { StatCard } from "./StatCard";
import {
  AppointmentTrendChart,
  type AppointmentTrendPoint,
} from "./AppointmentTrendChart";
import { AppointmentStatusChart } from "./AppointmentStatusChart";
import {
  RecentAppointmentsTable,
  type DashboardAppointment,
} from "./RecentAppointmentsTable";
import { PracticeProfileCard } from "./PracticeProfileCard";
import { OrgActivityPanel } from "./OrgActivityPanel";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Org-wide activity breakdown for one resource (Intake or Consultation). */
interface ActivityBreakdown {
  total: number;
  byStatus: Record<string, number>;
}

interface DashboardOverviewProps {
  /** Doctor display name for the welcome heading. */
  doctorName: string;
  /**
   * Up to 200 of this practitioner's appointments (any status, any date),
   * fetched server-side via listAppointmentsAction. All stats/charts below
   * are derived from this single array.
   */
  appointments: TAppointmentResponse[];
  /** Practice specialty labels for the Practice Profile card. */
  specialties: string[];
  /** Whether the doctor's PractitionerRole is active. */
  roleActive: boolean | null;
  /** Weekday codes (lowercase 3-letter) with declared availability. */
  availableDays: string[];
  /** Organisation-wide AI Intake activity breakdown. */
  intakeActivity: ActivityBreakdown;
  /** Organisation-wide AI Consultation activity breakdown. */
  consultationActivity: ActivityBreakdown;
  /** Localised base href for the full appointments list. */
  appointmentsHref: string;
  /** Localised href for the doctor's profile settings page. */
  profileHref: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the patient's display name from appointment participants. */
function getPatientName(appt: TAppointmentResponse): string | null {
  return (
    appt.subject_display ??
    appt.participant?.find((p) => p.reference_type === "Patient")
      ?.reference_display ??
    null
  );
}

/** Short month labels indexed 0–11. */
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Builds monthly bar chart data for the last `months` calendar months
 * (inclusive of the current one).
 *
 * @param appointments - Full appointment list.
 * @param months - Number of months to include (default 6).
 */
function buildMonthlyData(
  appointments: TAppointmentResponse[],
  months = 6,
): AppointmentTrendPoint[] {
  const now = new Date();
  const result: AppointmentTrendPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = target.getFullYear();
    const month = target.getMonth();

    const inMonth = appointments.filter((a) => {
      if (!a.start) return false;
      const d = new Date(a.start);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    result.push({
      name: MONTH_LABELS[month],
      booked: inMonth.length,
      completed: inMonth.filter((a) => a.status === "fulfilled").length,
    });
  }

  return result;
}

/** True when an ISO datetime falls on today's calendar date (local time). */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** True when an ISO datetime falls within the current calendar week (Sun–Sat). */
function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Doctor practice-overview dashboard. All appointment stats/charts are
 * derived client-side from the `appointments` prop.
 */
export function DashboardOverview({
  doctorName,
  appointments,
  specialties,
  roleActive,
  availableDays,
  intakeActivity,
  consultationActivity,
  appointmentsHref,
  profileHref,
}: DashboardOverviewProps) {
  /* ── Counts ── */
  const stats = useMemo(() => {
    const today = appointments.filter((a) => a.start && isToday(a.start)).length;
    const thisWeek = appointments.filter(
      (a) => a.start && isThisWeek(a.start),
    ).length;
    const pending = appointments.filter(
      (a) => a.status === "pending" || a.status === "booked",
    ).length;
    const completed = appointments.filter((a) => a.status === "fulfilled").length;
    const cancelled = appointments.filter(
      (a) => a.status === "cancelled" || a.status === "noshow",
    ).length;
    return { today, thisWeek, pending, completed, cancelled };
  }, [appointments]);

  /* ── Status breakdown (all-time, within the fetched window) ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of appointments) {
      const status = a.status ?? "unknown";
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [appointments]);

  /* ── Monthly trend (last 6 months) ── */
  const monthlyData = useMemo(
    () => buildMonthlyData(appointments, 6),
    [appointments],
  );

  /* ── Recent appointments (last 5 by start date) ── */
  const recentAppointments = useMemo((): DashboardAppointment[] => {
    return [...appointments]
      .sort((a, b) => {
        const aTime = a.start ? new Date(a.start).getTime() : 0;
        const bTime = b.start ? new Date(b.start).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        date: a.start,
        type: a.appointment_type_display ?? a.appointment_type_text,
        patientName: getPatientName(a),
        status: a.status,
      }));
  }, [appointments]);

  const availableDaysSet = useMemo(() => new Set(availableDays), [availableDays]);

  return (
    <div className="space-y-6">
      {/* ── Welcome heading ── */}
      <div>
        <h1 className="text-2xl font-semibold">
          Practice Overview — Dr. {doctorName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          A snapshot of your appointments and organization activity.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Today"
          value={stats.today}
          icon={CalendarDays}
          colorVariant="blue"
          note="Appointments scheduled today"
          href={appointmentsHref}
        />
        <StatCard
          title="This Week"
          value={stats.thisWeek}
          icon={CalendarClock}
          colorVariant="indigo"
          note="Appointments this calendar week"
          href={appointmentsHref}
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          colorVariant="yellow"
          note="Awaiting confirmation or upcoming"
          href={appointmentsHref}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          colorVariant="emerald"
          note="Fulfilled consultations"
          href={appointmentsHref}
        />
        <StatCard
          title="Cancelled"
          value={stats.cancelled}
          icon={XCircle}
          colorVariant="rose"
          note="Cancelled or no-show"
          href={appointmentsHref}
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* ── Left column ── */}
        <div className="space-y-6">
          <div className="h-80">
            <AppointmentTrendChart data={monthlyData} />
          </div>
          <RecentAppointmentsTable
            appointments={recentAppointments}
            viewAllHref={appointmentsHref}
          />
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          <div className="h-80">
            <AppointmentStatusChart counts={statusCounts} />
          </div>
          <PracticeProfileCard
            specialties={specialties}
            active={roleActive}
            availableDays={availableDaysSet}
            editHref={profileHref}
          />
          <OrgActivityPanel
            intake={intakeActivity}
            consultation={consultationActivity}
          />
        </div>
      </div>
    </div>
  );
}
