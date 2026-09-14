/**
 * AppointmentStatusChart — donut chart breaking down this practitioner's
 * appointments by FHIR status.
 *
 * Layer: client / telemedicine / doctor / component / dashboard-overview
 *
 * Colors are the same status-to-color mapping already used everywhere else
 * in the app (DoctorAppointmentColumns, TodayAppointmentList, etc.) — status
 * is a reserved-color case, not a generic categorical series, so this reuses
 * the existing system-wide mapping rather than inventing a new palette.
 * Zero-count statuses are omitted entirely; identity is never color-alone —
 * every slice has a text label with its count in the list below the chart.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentStatusChartProps {
  /** Count of appointments per FHIR status code. */
  counts: Record<string, number>;
}

// ── Status → label/color (mirrors DoctorAppointmentColumns' STATUS_CLASS) ────

const STATUS_META: Record<string, { label: string; color: string }> = {
  fulfilled: { label: "Completed", color: "#059669" }, // emerald-600
  booked: { label: "Booked", color: "#2563eb" }, // blue-600
  pending: { label: "Pending", color: "#d97706" }, // amber-600
  arrived: { label: "Arrived", color: "#4f46e5" }, // indigo-600
  "checked-in": { label: "Checked In", color: "#0891b2" }, // cyan-600
  waitlist: { label: "Waitlist", color: "#9333ea" }, // purple-600
  proposed: { label: "Proposed", color: "#64748b" }, // slate-500
  cancelled: { label: "Cancelled", color: "#e11d48" }, // rose-600
  noshow: { label: "No Show", color: "#ea580c" }, // orange-600
  "entered-in-error": { label: "Error", color: "#9f1239" }, // rose-800
};

/** Fallback for a status code not present in STATUS_META. */
const FALLBACK_META = { color: "#6b7280" }; // gray-500

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a donut chart of appointment status distribution, with a labelled
 * count list below (never color-alone identity).
 *
 * @param counts - Map of FHIR status code → appointment count.
 */
export function AppointmentStatusChart({ counts }: AppointmentStatusChartProps) {
  const slices = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      label: STATUS_META[status]?.label ?? status,
      color: STATUS_META[status]?.color ?? FALLBACK_META.color,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const total = slices.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-base font-semibold">Status Breakdown</h2>
        <p className="text-xs text-muted-foreground">{total} total</p>
      </div>

      {slices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 flex-1">
          No appointments yet.
        </p>
      ) : (
        <>
          <div className="relative flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="55%"
                  outerRadius="95%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.status} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.5rem",
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    color: "var(--popover-foreground)",
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend / counts — text labels, not color-alone */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 shrink-0">
            {slices.map((slice) => (
              <div
                key={slice.status}
                className="flex items-center gap-1.5 text-xs"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-muted-foreground truncate">
                  {slice.label}
                </span>
                <span className="font-medium tabular-nums ml-auto">
                  {slice.count}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
