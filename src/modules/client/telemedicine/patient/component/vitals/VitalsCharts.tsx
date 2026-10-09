/**
 * VitalsCharts — trend chart grid for the patient vitals page.
 *
 * Layer: client / telemedicine / patient / component / vitals
 *
 * Same Recharts + CSS-variable-token convention as the doctor dashboard's
 * VitalsInsights card (and the practice-overview dashboard's charts before
 * it), but laid out as a grid of always-visible cards rather than a tabbed
 * single-chart view — this is the patient's own dedicated, full-detail page,
 * not a compact dashboard widget, so there's room to show everything at once.
 */

"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDisplayDayMonth } from "@/modules/shared/helper";
import type { TVitalsResponse } from "@/modules/entities/schemas/vitals";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** One chart-ready point: short date label + numeric value. */
interface TrendPoint {
  day: string;
  value: number;
}

/**
 * Extracts one metric column from a flat Vitals list into oldest→newest
 * {day, value} points, dropping rows with no timestamp or no value for
 * that metric. Mirrors VitalsInsights' own toTrend.
 *
 * @param entries - Vitals rows for the current patient + date range.
 * @param pick - Reads the metric of interest off one row.
 */
function toTrend(
  entries: TVitalsResponse[],
  pick: (v: TVitalsResponse) => number | null | undefined,
): TrendPoint[] {
  return entries
    .map((v) => ({ at: v.recorded_at ?? v.date, value: pick(v) }))
    .filter(
      (p): p is { at: string; value: number } => !!p.at && p.value != null,
    )
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((p) => ({ day: formatDisplayDayMonth(p.at), value: p.value }));
}

/** Shared axis/grid/tooltip chrome so every card's chart reads as one system. */
function ChartChrome() {
  return (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
      <XAxis
        dataKey="day"
        axisLine={false}
        tickLine={false}
        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        minTickGap={24}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        width={36}
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
    </>
  );
}

/** One metric's latest reading + trend chart, rendered inside a Card. */
function ChartCard({
  title,
  unit,
  trend,
  strokeVar,
  emptyMessage,
}: {
  title: string;
  unit: string;
  trend: TrendPoint[];
  strokeVar: string;
  emptyMessage: string;
}) {
  const latest = trend.at(-1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trend.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-2xl font-semibold leading-none">
              {latest?.value}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                {unit}
              </span>
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <ChartChrome />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={title}
                    stroke={strokeVar}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Blood pressure needs two lines on one chart, so it gets its own card body. */
function BloodPressureCard({
  systolic,
  diastolic,
}: {
  systolic: TrendPoint[];
  diastolic: TrendPoint[];
}) {
  const merged = systolic.map((s, i) => ({
    day: s.day,
    systolic: s.value,
    diastolic: diastolic[i]?.value ?? null,
  }));
  const latestSys = systolic.at(-1)?.value;
  const latestDia = diastolic.at(-1)?.value;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Blood Pressure
        </CardTitle>
      </CardHeader>
      <CardContent>
        {merged.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
            No blood pressure recorded in this range.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-2xl font-semibold leading-none">
              {latestSys ?? "—"}/{latestDia ?? "—"}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                mmHg
              </span>
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={merged} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <ChartChrome />
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    name="Systolic"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    name="Diastolic"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VitalsChartsProps {
  /** Vitals rows already scoped to the active patient + date range. */
  entries: TVitalsResponse[];
}

/**
 * Grid of trend charts (heart rate, blood pressure, weight, sleep, steps) —
 * all derived from the same entries array the table renders, so a date-range
 * change updates both together by construction.
 *
 * @param entries - Vitals rows for the current patient + date range.
 */
export function VitalsCharts({ entries }: VitalsChartsProps) {
  const heartRate = useMemo(() => toTrend(entries, (v) => v.heart_rate), [entries]);
  const systolic = useMemo(
    () => toTrend(entries, (v) => v.blood_pressure_systolic),
    [entries],
  );
  const diastolic = useMemo(
    () => toTrend(entries, (v) => v.blood_pressure_diastolic),
    [entries],
  );
  const weight = useMemo(() => toTrend(entries, (v) => v.weight_kg), [entries]);
  const sleep = useMemo(
    () => toTrend(entries, (v) => (v.sleep_minutes != null ? v.sleep_minutes / 60 : null)),
    [entries],
  );
  const steps = useMemo(() => toTrend(entries, (v) => v.steps), [entries]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ChartCard
        title="Heart Rate"
        unit="bpm"
        trend={heartRate}
        strokeVar="var(--color-chart-1)"
        emptyMessage="No heart rate recorded in this range."
      />
      <BloodPressureCard systolic={systolic} diastolic={diastolic} />
      <ChartCard
        title="Weight"
        unit="kg"
        trend={weight}
        strokeVar="var(--color-chart-4)"
        emptyMessage="No weight recorded in this range."
      />
      <ChartCard
        title="Sleep"
        unit="hrs"
        trend={sleep}
        strokeVar="var(--color-chart-5)"
        emptyMessage="No sleep data recorded in this range."
      />
      <ChartCard
        title="Steps"
        unit="steps"
        trend={steps}
        strokeVar="var(--color-chart-2)"
        emptyMessage="No step data recorded in this range."
      />
    </div>
  );
}
