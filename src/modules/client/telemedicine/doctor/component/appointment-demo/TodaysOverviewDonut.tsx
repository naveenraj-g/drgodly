/**
 * @file TodaysOverviewDonut.tsx
 * @description Donut chart summarising today's appointments by the
 * *exact* FHIR appointment status (Pending / Booked / Arrived / Fulfilled /
 * Cancelled / ...), with a centered "x/y Appointments" total and a labelled
 * legend.
 * @layer client/telemedicine/doctor/component/appointment-demo
 *
 * Reuses STATUS_LABEL from DoctorAppointmentColumns — the same wording the
 * table's own status badges show — rather than a separate coarse bucket, so
 * the donut and the table never disagree about what counts as what (e.g. a
 * "pending" appointment and a "booked" one used to both read as "Scheduled"
 * here, hiding a real difference the table itself already distinguishes).
 *
 * Colors are a reserved status mapping, not a generic categorical palette —
 * same convention as AppointmentStatusChart (dashboard-overview) and the
 * table's own status badge colors (translated to hex since Recharts fills
 * can't consume Tailwind classes directly). Identity is never color-alone:
 * every slice also has a text label + count in the legend.
 */

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  APPOINTMENT_STATUS_OPTIONS,
  STATUS_LABEL,
} from "@/modules/client/telemedicine/doctor/component/appointments/list/DoctorAppointmentColumns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TodaysOverviewDonutProps {
  /** Count of today's appointments per *raw* FHIR status code. */
  counts: Record<string, number>;
}

// ── Status → color (hex, for Recharts fill) ──────────────────────────────────
// Same semantic families as DoctorAppointmentColumns' STATUS_CLASS (slate/
// amber/blue/teal/green/red/orange/cyan/purple), just as hex instead of
// Tailwind utility classes.

const STATUS_HEX: Record<string, string> = {
  proposed: "#64748b", // slate-500
  pending: "#d97706", // amber-600
  booked: "#2563eb", // blue-600
  arrived: "#0d9488", // teal-600
  fulfilled: "#16a34a", // green-600
  cancelled: "#dc2626", // red-600
  noshow: "#ea580c", // orange-600
  "entered-in-error": "#991b1b", // red-800
  "checked-in": "#0891b2", // cyan-600
  waitlist: "#9333ea", // purple-600
};

/** Same ordering as the table's Status filter options, for a stable legend. */
const STATUS_ORDER = APPOINTMENT_STATUS_OPTIONS.map((o) => o.value);

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the "Today's Overview" donut with a centered total and a
 * color-dot + count legend, one slice per raw status actually present.
 *
 * @param counts - Appointment count per raw FHIR status code.
 */
export function TodaysOverviewDonut({ counts }: TodaysOverviewDonutProps) {
  // Only statuses that actually occurred today — an all-zero legend for
  // ten possible codes would be noise, not information.
  const present = STATUS_ORDER.filter((status) => (counts[status] ?? 0) > 0);
  const total = present.reduce((sum, status) => sum + counts[status], 0);

  const slices = present.map((status) => ({
    status,
    label: STATUS_LABEL[status] ?? status,
    color: STATUS_HEX[status] ?? "#9ca3af", // gray-400 fallback for an unmapped code
    count: counts[status],
  }));

  return (
    <div className="flex items-center gap-6">
      {/* Scales with however wide the card actually is (it used to be a
          fixed size-32 regardless of a wider card having plenty of room)
          — capped so it doesn't become absurd on a very wide card, and
          floored so it stays legible on a narrow one. */}
      <div className="relative aspect-square w-[42%] min-w-28 max-w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices.length > 0 ? slices : [{ status: "empty", count: 1 }]}
              dataKey="count"
              nameKey="label"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {slices.length > 0 ? (
                slices.map((slice) => (
                  <Cell key={slice.status} fill={slice.color} />
                ))
              ) : (
                <Cell fill="var(--muted)" />
              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Centered total — never rely on the ring's colors alone to convey it */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-tight">
            {total}/{total}
          </span>
          <span className="text-xs text-muted-foreground leading-tight text-center">
            Appointments
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-w-0 flex-col gap-2 text-sm">
        {present.length > 0 ? (
          present.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: STATUS_HEX[status] ?? "#9ca3af" }}
              />
              <span className="text-muted-foreground">{STATUS_LABEL[status] ?? status}</span>
              <span className="font-medium tabular-nums ml-auto pl-3">
                {counts[status]}
              </span>
            </div>
          ))
        ) : (
          <span className="text-muted-foreground">No appointments today.</span>
        )}
      </div>
    </div>
  );
}
