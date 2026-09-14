/**
 * @file TodaysOverviewDonut.tsx
 * @description Donut chart summarising today's demo appointments by coarse
 * status (Completed / In Progress / Scheduled / Cancelled), with a centered
 * "x/y Appointments" total and a labelled legend.
 * @layer client/telemedicine/doctor/component/appointment-demo
 *
 * Colors are a reserved status mapping (good/informational/neutral/muted),
 * not a generic categorical palette — mirrors the convention already used by
 * AppointmentStatusChart (dashboard-overview) so status color never doubles
 * as an arbitrary series color elsewhere in the app. Identity is never
 * color-alone: every slice also has a text label + count in the legend.
 */

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { CoarseStatus } from "./appointmentDisplay";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TodaysOverviewDonutProps {
  /** Count of today's appointments per coarse status. */
  counts: Record<CoarseStatus, number>;
}

// ── Status → label/color ─────────────────────────────────────────────────────

const STATUS_META: Record<CoarseStatus, { label: string; color: string }> = {
  completed: { label: "Completed", color: "#16a34a" }, // green-600
  "in-progress": { label: "In Progress", color: "#2563eb" }, // blue-600
  scheduled: { label: "Scheduled", color: "#7dd3fc" }, // sky-300
  cancelled: { label: "Cancelled", color: "#d1d5db" }, // gray-300
};

const STATUS_ORDER: CoarseStatus[] = [
  "completed",
  "in-progress",
  "scheduled",
  "cancelled",
];

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the "Today's Overview" donut with a centered total and a
 * color-dot + count legend.
 *
 * @param counts - Appointment count per coarse status.
 */
export function TodaysOverviewDonut({ counts }: TodaysOverviewDonutProps) {
  const total = STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);

  const slices = STATUS_ORDER.filter((status) => counts[status] > 0).map(
    (status) => ({
      status,
      label: STATUS_META[status].label,
      color: STATUS_META[status].color,
      count: counts[status],
    }),
  );

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-32 shrink-0">
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
          <span className="text-lg font-bold leading-tight">
            {total}/{total}
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight text-center">
            Appointments
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_META[status].color }}
            />
            <span className="text-muted-foreground">{STATUS_META[status].label}</span>
            <span className="font-medium tabular-nums ml-auto pl-3">
              {counts[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
