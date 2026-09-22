/**
 * VitalsInsights — patient vitals trend chart for the doctor dashboard.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * UI-only for now: SAMPLE_VITAL_OBSERVATIONS below is hand-authored, but
 * shaped exactly like a real TObservationResponse[] page (LOINC codes,
 * category "vital-signs", value_quantity_value/unit, effective_date_time) —
 * the same fields listObservationsAction already returns elsewhere in this
 * app (see appointment-review/fromFhir.ts's observationFromFhir). Wiring in
 * real data later means replacing that constant with a
 * listObservationsAction({ payload: { subject_id, category: "vital-signs" } })
 * call; trendFor() below already reads a plain TObservationResponse[] and
 * filters by LOINC code, so it doesn't otherwise change.
 *
 * Tabbed rather than a grid of separate cards (same Tabs pattern as
 * ConsultationInsights.tsx's SOAP/Assessment/Conversation tabs) — one chart
 * visible at a time keeps this to a single fixed-height card on the
 * dashboard instead of a tall grid the doctor has to scroll past.
 *
 * Charts use Recharts with the same CSS-variable-token convention as the
 * practice-overview dashboard's charts (AppointmentTrendChart.tsx) rather
 * than hardcoded hex, so they follow light/dark theme automatically.
 */

"use client";

import { Activity, Droplets, Gauge, HeartPulse, Thermometer, Wind } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE } from "@/modules/shared/helper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";

// ── Sample data (UI-only placeholder — see file header) ───────────────────────

/** LOINC codes for the vitals shown here, all under system "http://loinc.org". */
const LOINC = {
  heartRate: "8867-4",
  systolicBp: "8480-6",
  diastolicBp: "8462-4",
  temperature: "8310-5",
  spo2: "59408-5",
  respiratoryRate: "9279-1",
} as const;

/** Builds one FHIR-shaped Observation reading — matches TObservationResponse exactly. */
function reading(
  id: number,
  code: string,
  display: string,
  value: number,
  unit: string,
  daysAgo: number,
): TObservationResponse {
  const effective = new Date();
  effective.setDate(effective.getDate() - daysAgo);
  return {
    id,
    status: "final",
    code_system: "http://loinc.org",
    code_code: code,
    code_display: display,
    subject_type: "Patient",
    subject_id: 10042,
    category: [
      {
        id,
        coding_system: "http://terminology.hl7.org/CodeSystem/observation-category",
        coding_code: "vital-signs",
        coding_display: "Vital Signs",
      },
    ],
    effective_date_time: effective.toISOString(),
    value_quantity_value: value,
    value_quantity_unit: unit,
  };
}

/** 6 days of readings per vital, oldest first — a small realistic trend, not flat lines. */
const SAMPLE_VITAL_OBSERVATIONS: TObservationResponse[] = [
  ...[74, 78, 71, 80, 76, 72].map((v, i) =>
    reading(1000 + i, LOINC.heartRate, "Heart rate", v, "bpm", 5 - i),
  ),
  ...[124, 128, 121, 130, 119, 118].map((v, i) =>
    reading(2000 + i, LOINC.systolicBp, "Systolic blood pressure", v, "mmHg", 5 - i),
  ),
  ...[80, 82, 78, 84, 77, 76].map((v, i) =>
    reading(2100 + i, LOINC.diastolicBp, "Diastolic blood pressure", v, "mmHg", 5 - i),
  ),
  ...[36.9, 37.1, 36.8, 37.3, 36.9, 36.8].map((v, i) =>
    reading(3000 + i, LOINC.temperature, "Body temperature", v, "Cel", 5 - i),
  ),
  ...[98, 97, 99, 96, 98, 98].map((v, i) =>
    reading(4000 + i, LOINC.spo2, "Oxygen saturation", v, "%", 5 - i),
  ),
  ...[16, 18, 15, 17, 16, 16].map((v, i) =>
    reading(5000 + i, LOINC.respiratoryRate, "Respiratory rate", v, "/min", 5 - i),
  ),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** One chart-ready point: short day label + numeric value. */
interface TrendPoint {
  day: string;
  value: number;
}

/** Formats effective_date_time as a short weekday label, e.g. "Mon". */
function dayLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  return formatInTimeZone(new Date(iso), APP_TIMEZONE, "EEE");
}

/**
 * Extracts one LOINC code's readings from a flat Observation list, sorted
 * oldest → newest, as {day, value} points ready for a Recharts LineChart.
 *
 * @param observations - Flat Observation array (real data will be shaped identically).
 * @param code - LOINC code to filter on (code_code).
 */
function trendFor(observations: TObservationResponse[], code: string): TrendPoint[] {
  return observations
    .filter((o) => o.code_code === code)
    .sort(
      (a, b) =>
        new Date(a.effective_date_time ?? 0).getTime() -
        new Date(b.effective_date_time ?? 0).getTime(),
    )
    .map((o) => ({
      day: dayLabel(o.effective_date_time),
      value: o.value_quantity_value ?? 0,
    }));
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

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Vitals card for the doctor dashboard's selected-appointment detail grid.
 * Currently renders SAMPLE_VITAL_OBSERVATIONS — see file header for the plan
 * to swap in a real fetch without changing the rest of this component.
 */
export function VitalsInsights() {
  const heartRate = trendFor(SAMPLE_VITAL_OBSERVATIONS, LOINC.heartRate);
  const systolic = trendFor(SAMPLE_VITAL_OBSERVATIONS, LOINC.systolicBp);
  const diastolic = trendFor(SAMPLE_VITAL_OBSERVATIONS, LOINC.diastolicBp);
  const temperature = trendFor(SAMPLE_VITAL_OBSERVATIONS, LOINC.temperature);
  const spo2 = trendFor(SAMPLE_VITAL_OBSERVATIONS, LOINC.spo2);
  const respiratoryRate = trendFor(SAMPLE_VITAL_OBSERVATIONS, LOINC.respiratoryRate);

  return (
    // h-full: this card is wrapped in an extra div by DoctorDashboard (for
    // the conditional col-span), so it isn't the grid's direct item and
    // doesn't inherit the row's default align-items:stretch height on its
    // own — without this it stays content-sized and reads shorter than
    // IntakeInsights next to it.
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          Vitals
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            <TabsTrigger value="temperature" className="gap-1.5 text-xs">
              <Thermometer className="size-3.5" />
              Temperature
            </TabsTrigger>
            <TabsTrigger value="spo2" className="gap-1.5 text-xs">
              <Droplets className="size-3.5" />
              SpO2
            </TabsTrigger>
            <TabsTrigger value="respiratoryRate" className="gap-1.5 text-xs">
              <Wind className="size-3.5" />
              Resp. Rate
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

          <TabsContent value="temperature">
            <VitalTabPanel
              label="Temperature"
              unit="°C"
              trend={temperature}
              strokeVar="var(--color-chart-4)"
            />
          </TabsContent>

          <TabsContent value="spo2">
            <VitalTabPanel
              label="SpO2"
              unit="%"
              trend={spo2}
              strokeVar="var(--color-chart-5)"
            />
          </TabsContent>

          <TabsContent value="respiratoryRate">
            <VitalTabPanel
              label="Respiratory Rate"
              unit="/min"
              trend={respiratoryRate}
              strokeVar="var(--color-chart-1)"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
