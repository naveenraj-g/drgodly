/**
 * VitalsInsights — compact patient vitals trend card.
 *
 * Layer: client / telemedicine / shared / components / vitals
 *
 * Shared by the doctor dashboard (scoped to whichever appointment's patient
 * is selected) and the patient dashboard (scoped to the logged-in patient's
 * own record) — the component itself has no doctor- or patient-specific
 * logic, just a `patientId` prop, so one implementation serves both rather
 * than forking two copies that would drift.
 *
 * Backed by the Vitals resource (custom, non-FHIR — wearable/manual health
 * metrics; see modules/entities/schemas/vitals) via listVitalsAction, scoped
 * to `patientId` and a selectable time range (1 week / 1 month / 3 months /
 * 6 months / 1 year — defaults to 1 week). The range tabs drive
 * `recorded_at_from`; the query refetches whenever the patient or range
 * changes (queryKey includes both).
 *
 * Vitals rows are wearable-style daily summaries (steps, sleep, heart rate,
 * blood pressure, weight, ...), one row roughly per day — not FHIR
 * Observations, so there's no LOINC-code filtering: each tab just reads a
 * different column off the same row set.
 *
 * Tabbed rather than a grid of separate cards (same Tabs pattern as
 * ConsultationInsights.tsx's SOAP/Assessment/Conversation tabs) — one chart
 * visible at a time keeps this to a single fixed-height card on the
 * dashboard instead of a tall grid the viewer has to scroll past.
 *
 * Charts use Recharts with the same CSS-variable-token convention as the
 * practice-overview dashboard's charts (AppointmentTrendChart.tsx) rather
 * than hardcoded hex, so they follow light/dark theme automatically.
 */

"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Gauge, HeartPulse, Moon, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listVitalsAction } from "@/modules/server/presentation/actions/vitals";
import { formatDisplayDayMonth } from "@/modules/shared/helper";
import type { TVitalsResponse } from "@/modules/entities/schemas/vitals";

/** Rows fetched per page — matches ListVitalsValidationSchema's hard cap. */
const PAGE_LIMIT = 200;

/**
 * Safety cap on pages fetched for one range: bounds a wide range with dense
 * data (e.g. multiple wearable readings/day over a year) to at most this
 * many requests instead of looping until every row is collected.
 */
const MAX_PAGES = 5;

// ── Range filter ────────────────────────────────────────────────────────────

type VitalsRange = "1w" | "1m" | "3m" | "6m" | "1y";

/** Rolling-window length per range option — a fixed duration back from now,
 *  not a calendar boundary, so this needs no timezone handling at all. */
const RANGE_DAYS: Record<VitalsRange, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

const RANGE_OPTIONS: { value: VitalsRange; label: string }[] = [
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** One chart-ready point: short date label + numeric value. */
interface TrendPoint {
  day: string;
  value: number;
}

/**
 * Extracts one metric column from a flat Vitals list into oldest→newest
 * {day, value} points, dropping rows with no timestamp or no value for
 * that metric.
 *
 * @param entries - Vitals rows for the current patient + range.
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

/** Shared axis/grid/tooltip chrome so every tab's chart reads as one system. */
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

// ── Single-vital tab panel ────────────────────────────────────────────────────

interface VitalTabPanelProps {
  label: string;
  unit: string;
  trend: TrendPoint[];
  strokeVar: string;
}

/** One vital's latest reading + its full-size trend chart, for one TabsContent. */
function VitalTabPanel({ label, unit, trend, strokeVar }: VitalTabPanelProps) {
  const latest = trend.at(-1);

  return (
    <div className="space-y-2">
      <p className="text-2xl font-semibold leading-none">
        {latest?.value ?? "—"}
        <span className="text-sm font-normal text-muted-foreground ml-1.5">{unit}</span>
      </p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <ChartChrome />
            <Line
              type="monotone"
              dataKey="value"
              name={label}
              stroke={strokeVar}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Blood pressure tab panel (systolic + diastolic together) ────────────────

interface BloodPressurePanelProps {
  systolic: TrendPoint[];
  diastolic: TrendPoint[];
}

/** Combines the two BP readings into one two-line chart, keyed by day. */
function BloodPressurePanel({ systolic, diastolic }: BloodPressurePanelProps) {
  const merged = systolic.map((s, i) => ({
    day: s.day,
    systolic: s.value,
    diastolic: diastolic[i]?.value ?? null,
  }));
  const latestSys = systolic.at(-1)?.value ?? "—";
  const latestDia = diastolic.at(-1)?.value ?? "—";

  return (
    <div className="space-y-2">
      <p className="text-2xl font-semibold leading-none">
        {latestSys}/{latestDia}
        <span className="text-sm font-normal text-muted-foreground ml-1.5">mmHg</span>
      </p>
      <div className="h-44">
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
  );
}

/** Shown when there's no patient selected, or the patient has no vitals in range. */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-52 items-center justify-center text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VitalsInsightsProps {
  /** FHIR Patient.id to show vitals for — nullish leaves the card empty. */
  patientId: number | null | undefined;
  /**
   * Message shown when patientId is nullish. Defaults to the doctor
   * dashboard's wording ("select an appointment"); the patient dashboard
   * never hits this branch since its own patientId is always set, but this
   * stays overridable rather than assuming every future caller does too.
   */
  emptyPatientMessage?: string;
}

/**
 * Compact vitals trend card — doctor dashboard uses it scoped to the
 * selected appointment's patient, patient dashboard scoped to the logged-in
 * patient themselves.
 *
 * @param patientId - Patient to show vitals for; the card stays empty until this is set.
 * @param emptyPatientMessage - Override for the "no patient selected" message.
 */
export function VitalsInsights({
  patientId,
  emptyPatientMessage = "Select an appointment to see vitals.",
}: VitalsInsightsProps) {
  const [range, setRange] = useState<VitalsRange>("1w");

  // Rolling window from now — a fixed duration, so no timezone handling is
  // needed (unlike a calendar-day/month boundary, subtracting a duration
  // from a real instant is timezone-independent).
  const recordedAtFrom = useMemo(
    () => new Date(Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000).toISOString(),
    [range],
  );

  // Plain paginating query rather than useServerActionQuery — a single
  // page (limit 200) silently truncates the 1Y range for any patient with
  // more than ~200 days of history, since fhir-gql returns newest-first
  // with no compensating recorded_at_to. This loops pages until the range
  // is fully covered (or MAX_PAGES, whichever comes first).
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["dashboard-vitals", patientId, range],
    enabled: !!patientId,
    queryFn: async () => {
      const collected: TVitalsResponse[] = [];
      let offset = 0;

      for (let page = 0; page < MAX_PAGES; page++) {
        const [result, err] = await listVitalsAction({
          payload: {
            patient_id: patientId ?? 0,
            recorded_at_from: recordedAtFrom,
            limit: PAGE_LIMIT,
            offset,
          },
        });
        if (err) throw err;

        collected.push(...result.data);

        // Stop once every matching row has been collected, or the backend
        // returned a short page (nothing left to fetch).
        if (collected.length >= result.total || result.data.length < PAGE_LIMIT) {
          break;
        }
        offset += PAGE_LIMIT;
      }

      return collected;
    },
  });

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

  const hasData = entries.length > 0;

  return (
    // h-full: on the doctor dashboard this card is wrapped in an extra div
    // (for the conditional col-span), so it isn't the grid's direct item and
    // doesn't inherit the row's default align-items:stretch height on its
    // own — without this it stays content-sized and reads shorter than
    // IntakeInsights next to it. Harmless on the patient dashboard, which
    // doesn't rely on stretch-height sibling alignment.
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            Vitals
          </CardTitle>
          <Tabs value={range} onValueChange={(v) => setRange(v as VitalsRange)}>
            <TabsList className="h-7 p-0.5">
              {RANGE_OPTIONS.map((opt) => (
                <TabsTrigger
                  key={opt.value}
                  value={opt.value}
                  className="h-6 px-2 text-[11px]"
                >
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {!patientId ? (
          <EmptyState message={emptyPatientMessage} />
        ) : isLoading ? (
          <Skeleton className="h-52 w-full" />
        ) : !hasData ? (
          <EmptyState message="No vitals recorded for this patient in this range." />
        ) : (
          <Tabs defaultValue="heartRate">
            <TabsList className="w-full h-auto flex-wrap justify-center mb-4">
              <TabsTrigger value="heartRate" className="gap-1.5 text-xs">
                <HeartPulse className="size-3.5" />
                Heart Rate
              </TabsTrigger>
              <TabsTrigger value="bloodPressure" className="gap-1.5 text-xs">
                <Gauge className="size-3.5" />
                Blood Pressure
              </TabsTrigger>
              <TabsTrigger value="weight" className="gap-1.5 text-xs">
                <Scale className="size-3.5" />
                Weight
              </TabsTrigger>
              <TabsTrigger value="sleep" className="gap-1.5 text-xs">
                <Moon className="size-3.5" />
                Sleep
              </TabsTrigger>
            </TabsList>

            <TabsContent value="heartRate">
              <VitalTabPanel
                label="Heart Rate"
                unit="bpm"
                trend={heartRate}
                strokeVar="var(--color-chart-1)"
              />
            </TabsContent>

            <TabsContent value="bloodPressure">
              <BloodPressurePanel systolic={systolic} diastolic={diastolic} />
            </TabsContent>

            <TabsContent value="weight">
              <VitalTabPanel
                label="Weight"
                unit="kg"
                trend={weight}
                strokeVar="var(--color-chart-4)"
              />
            </TabsContent>

            <TabsContent value="sleep">
              <VitalTabPanel
                label="Sleep"
                unit="hrs"
                trend={sleep}
                strokeVar="var(--color-chart-5)"
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
