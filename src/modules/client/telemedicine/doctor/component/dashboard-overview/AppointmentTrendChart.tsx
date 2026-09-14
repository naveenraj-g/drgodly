/**
 * AppointmentTrendChart — monthly appointment volume bar chart for the
 * doctor's practice-overview dashboard.
 *
 * Layer: client / telemedicine / doctor / component / dashboard-overview
 *
 * Shows two bars per month: total booked (muted) and completed/fulfilled
 * (primary). Same Recharts + CSS-variable convention as the patient
 * portal's AppointmentBarChart, so both dashboards read as one visual
 * system — deliberately not a new palette, per the app's own precedent.
 */

"use client";

import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  Legend,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

/** One data point per month shown in the chart. */
export interface AppointmentTrendPoint {
  /** Short month label, e.g. "Jan", "Feb". */
  name: string;
  /** Total appointments with this practitioner that month. */
  booked: number;
  /** Appointments marked fulfilled that month. */
  completed: number;
}

interface AppointmentTrendChartProps {
  /** Monthly time-series data (last N months). */
  data: AppointmentTrendPoint[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a dual-bar monthly trend chart inside a card.
 *
 * @param data - Array of monthly data points.
 */
export function AppointmentTrendChart({ data }: AppointmentTrendChartProps) {
  return (
    <Card className="rounded-xl p-4 h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold">Appointment Volume</h2>
        <p className="text-xs text-muted-foreground">Last 6 months</p>
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} barSize={20}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />

          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />

          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "0.5rem",
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />

          <Legend
            align="left"
            verticalAlign="top"
            wrapperStyle={{
              paddingTop: "12px",
              paddingBottom: "24px",
              textTransform: "capitalize",
              color: "var(--foreground)",
              fontSize: 13,
            }}
          />

          <Bar
            dataKey="booked"
            name="Total"
            fill="var(--muted-foreground)"
            legendType="circle"
            radius={[6, 6, 0, 0]}
          />

          <Bar
            dataKey="completed"
            name="Completed"
            fill="var(--primary)"
            legendType="circle"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
