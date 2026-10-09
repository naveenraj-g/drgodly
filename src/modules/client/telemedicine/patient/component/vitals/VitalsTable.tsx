/**
 * VitalsTable — client-side paginated table for the patient vitals page.
 *
 * Layer: client / telemedicine / patient / component / vitals
 *
 * Client-side pagination (not a separate server round-trip) deliberately:
 * the parent already fetches every row in the active date range for the
 * charts, so paginating that same array in the browser is both simpler and
 * guarantees the table can never show a different range than the charts.
 */

"use client";

import { useMemo } from "react";
import {
  DataTable,
  useDataTable,
} from "@/modules/client/shared/components/tables";
import { createVitalsColumns } from "./VitalsColumns";
import type { TVitalsResponse } from "@/modules/entities/schemas/vitals";

interface VitalsTableProps {
  /** Vitals rows already scoped to the active patient + date range. */
  entries: TVitalsResponse[];
  loading?: boolean;
}

/**
 * Paginated vitals record table, sourced from the same entries array the
 * charts render.
 *
 * @param entries - Vitals rows for the current patient + date range.
 * @param loading - Shows the table's built-in skeleton overlay while true.
 */
export function VitalsTable({ entries, loading }: VitalsTableProps) {
  const columns = useMemo(() => createVitalsColumns(), []);
  const { table } = useDataTable({
    columns,
    data: entries,
    initialSorting: [{ id: "date", desc: true }],
  });

  return (
    <DataTable
      table={table}
      loading={loading}
      emptyState="No vitals recorded in this range."
    />
  );
}
