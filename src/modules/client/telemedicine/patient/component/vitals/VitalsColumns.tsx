/**
 * VitalsColumns — table column definitions for the patient vitals page.
 *
 * Layer: client / telemedicine / patient / component / vitals
 *
 * Same metric set as vitals_dashboard.json's own DataTable (the A2UI
 * doctor/admin vitals view), so the raw-records table reads consistently
 * across surfaces.
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/modules/client/shared/components/tables";
import { formatDisplayDate } from "@/modules/shared/helper";
import type { TVitalsResponse } from "@/modules/entities/schemas/vitals";

/** Renders a numeric metric cell, or an em dash when the value is absent. */
function MetricCell({ value, unit }: { value: number | null | undefined; unit?: string }) {
  if (value == null) return <span className="text-muted-foreground/50">—</span>;
  return (
    <span className="tabular-nums">
      {value}
      {unit ? <span className="text-muted-foreground"> {unit}</span> : null}
    </span>
  );
}

/**
 * Builds the ColumnDef array for the patient vitals table.
 *
 * @returns TanStack Table v8 column definitions.
 */
export function createVitalsColumns(): ColumnDef<TVitalsResponse>[] {
  return [
    {
      id: "date",
      accessorFn: (row) => row.recorded_at ?? row.date,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Date" />,
      cell: ({ row }) => {
        const raw = row.original.recorded_at ?? row.original.date;
        return (
          <span className="tabular-nums text-sm">
            {raw ? formatDisplayDate(raw) : "—"}
          </span>
        );
      },
      meta: { label: "Date" },
    },
    {
      id: "heart_rate",
      accessorFn: (row) => row.heart_rate,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Heart Rate" />,
      cell: ({ row }) => <MetricCell value={row.original.heart_rate} unit="bpm" />,
      meta: { label: "Heart Rate" },
    },
    {
      id: "blood_pressure",
      accessorFn: (row) => row.blood_pressure_systolic,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Blood Pressure" />,
      cell: ({ row }) => {
        const { blood_pressure_systolic: sys, blood_pressure_diastolic: dia } = row.original;
        if (sys == null && dia == null) return <span className="text-muted-foreground/50">—</span>;
        return (
          <span className="tabular-nums">
            {sys ?? "—"}/{dia ?? "—"}
            <span className="text-muted-foreground"> mmHg</span>
          </span>
        );
      },
      meta: { label: "Blood Pressure" },
    },
    {
      id: "weight_kg",
      accessorFn: (row) => row.weight_kg,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Weight" />,
      cell: ({ row }) => <MetricCell value={row.original.weight_kg} unit="kg" />,
      meta: { label: "Weight" },
    },
    {
      id: "steps",
      accessorFn: (row) => row.steps,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Steps" />,
      cell: ({ row }) => <MetricCell value={row.original.steps} />,
      meta: { label: "Steps" },
    },
    {
      id: "sleep_minutes",
      accessorFn: (row) => row.sleep_minutes,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Sleep" />,
      cell: ({ row }) => {
        const minutes = row.original.sleep_minutes;
        if (minutes == null) return <span className="text-muted-foreground/50">—</span>;
        return <span className="tabular-nums">{(minutes / 60).toFixed(1)} hrs</span>;
      },
      meta: { label: "Sleep" },
    },
    {
      id: "calories_kcal",
      accessorFn: (row) => row.calories_kcal,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Calories" />,
      cell: ({ row }) => <MetricCell value={row.original.calories_kcal} unit="kcal" />,
      meta: { label: "Calories" },
    },
  ];
}
