/**
 * PatientDashboard — the main patient portal overview page component.
 *
 * Layer: client / telemedicine / patient / component / dashboard
 *
 * Receives the raw appointment list from the server page (fetched via SSR) and
 * derives all statistics client-side:
 *   - Total / pending / completed / cancelled counts
 *   - Monthly bar chart data (last 6 months)
 *   - Up to 5 most-recent appointments for the table
 *
 * No tanstack-query or client-side fetching here — the dashboard is intentionally
 * a pure display component seeded from the SSR-fetched data snapshot.
 *
 * Layout:
 *   Left column  — Welcome card, 4 stat cards (2×2 grid), bar chart (monthly trend)
 *   Right column — Radial summary chart, recent appointments table
 */

"use client";

import { useMemo } from "react";
import { Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { StatCard } from "./StatCard";
import { AppointmentBarChart, type AppointmentBarChartData } from "./AppointmentBarChart";
import { AppointmentSummaryChart } from "./AppointmentSummaryChart";
import { RecentAppointmentsTable, type DashboardAppointment } from "./RecentAppointmentsTable";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientDashboardProps {
  /** Patient's display name from the auth session. */
  userName: string;
  /**
   * Full (up to 200) appointment list fetched on the server.
   * Stats and chart data are derived from this array.
   */
  appointments: TAppointmentResponse[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the display name of the first Practitioner participant in an appointment.
 *
 * @param appt - FHIR appointment response.
 */
function getDoctorName(appt: TAppointmentResponse): string | null {
  return (
    appt.participant?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? null
  );
}

/** Short month labels indexed 0–11. */
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Builds monthly bar chart data for the last `months` calendar months (inclusive of current).
 *
 * @param appointments - Full appointment list.
 * @param months - Number of months to include (default 6).
 */
function buildMonthlyData(
  appointments: TAppointmentResponse[],
  months = 6,
): AppointmentBarChartData[] {
  const now = new Date();
  const result: AppointmentBarChartData[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = target.getFullYear();
    const month = target.getMonth(); // 0-indexed

    const inMonth = appointments.filter((a) => {
      if (!a.start) return false;
      const d = new Date(a.start);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const booked = inMonth.length;
    const completed = inMonth.filter((a) => a.status === "fulfilled").length;

    result.push({ name: MONTH_LABELS[month], booked, completed });
  }

  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Patient portal dashboard rendering stats, charts, and recent appointments.
 * All data is derived from the `appointments` prop — no additional fetches.
 *
 * @param userName - Authenticated user's display name.
 * @param appointments - Raw appointment list from `getMyAppointmentsAction`.
 */
export function PatientDashboard({ userName, appointments }: PatientDashboardProps) {
  /* ── Counts ── */
  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(
      (a) => a.status === "pending" || a.status === "booked",
    ).length;
    const completed = appointments.filter((a) => a.status === "fulfilled").length;
    const cancelled = appointments.filter((a) => a.status === "cancelled").length;
    return { total, pending, completed, cancelled };
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
        return bTime - aTime; // newest first
      })
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        date: a.start,
        doctorName: getDoctorName(a),
        status: a.status,
      }));
  }, [appointments]);

  return (
    <div className="space-y-6">
      {/* ── Welcome heading ── */}
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {userName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here&apos;s an overview of your appointments and health records.
        </p>
      </div>

      {/*
       * One shared grid for all four widgets, using `order` (not DOM
       * position) to control layout per breakpoint — this lets the mobile
       * stacking order (stats, recent, chart, summary) differ from the
       * desktop pairing (stats+summary in row 1, chart+recent in row 2)
       * without duplicating any component.
       *
       * 12 columns (rather than a plain 2-column grid) so each row can carry
       * its own ratio via col-span: row 1 is 9/3 (stats wide, summary
       * narrow), row 2 is 6/6 (chart/recent split evenly). Auto-placement
       * fills by ascending order value, wrapping to a new row once a row's
       * spans add up to 12 — order 1-2 (9+3) fill row 1, order 3-4 (6+6)
       * fill row 2. Below xl (single column) items just stack in order.
       *
       * xl:h-auto on the summary chart lets it stretch to the stat-cards
       * grid's own height (its only row sibling), instead of spanning the
       * whole page like before restructuring this.
       */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="order-1 xl:order-1 xl:col-span-9 grid grid-cols-2 gap-4">
          <StatCard
            title="Total"
            value={stats.total}
            icon={Calendar}
            colorVariant="blue"
            note="All appointments on record"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            colorVariant="yellow"
            note="Awaiting or upcoming"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            colorVariant="emerald"
            note="Fulfilled consultations"
          />
          <StatCard
            title="Cancelled"
            value={stats.cancelled}
            icon={XCircle}
            colorVariant="rose"
            note="Cancelled or no-show"
          />
        </div>

        <div className="order-4 xl:order-2 xl:col-span-3 h-[280px] xl:h-auto">
          <AppointmentSummaryChart
            pending={stats.pending}
            completed={stats.completed}
            total={stats.total}
          />
        </div>

        <div className="order-3 xl:order-3 xl:col-span-6 h-80">
          <AppointmentBarChart data={monthlyData} />
        </div>

        <div className="order-2 xl:order-4 xl:col-span-6">
          <RecentAppointmentsTable appointments={recentAppointments} />
        </div>
      </div>
    </div>
  );
}
