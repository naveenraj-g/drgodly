/**
 * PatientVitalsPage — detailed, filterable vitals view for the patient portal.
 *
 * Layer: client / telemedicine / patient / component / vitals
 *
 * One date-range filter (Today / This Week / This Month / custom) drives a
 * single vitals query; both the chart grid and the table render off that
 * same fetched array, so changing the range always updates them together —
 * there is no separate table-only or chart-only fetch to drift out of sync.
 *
 * Reads through listVitalsAction, the same FHIR-GQL-backed vitals client the
 * doctor dashboard's VitalsInsights card already uses. org_id is stamped
 * server-side from the session inside that action; patientId/userId are
 * resolved server-side in the page (requirePatientProfile) and passed down
 * as props here, the same pattern every other patient-facing intake/
 * consultation component in this app already uses.
 */

"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerActionQuery } from "@/lib/zsa-query";
import { listVitalsAction } from "@/modules/server/presentation/actions/vitals";
import { formatDisplayDate } from "@/modules/shared/helper";
import {
  VitalsDateRangeFilter,
  resolvePreset,
  type VitalsDatePreset,
  type VitalsDateRange,
} from "./VitalsDateRangeFilter";
import { VitalsCharts } from "./VitalsCharts";
import { VitalsTable } from "./VitalsTable";

// ── Props ─────────────────────────────────────────────────────────────────────

interface PatientVitalsPageProps {
  /** FHIR Patient.id of the logged-in patient — scopes the vitals query. */
  patientId: number;
  /** Better Auth userId of the logged-in patient. */
  userId: string;
  /** Better Auth active organization id — scopes the vitals query's tenant. */
  orgId?: string | null;
}

/** ListVitalsValidationSchema caps limit at 200 — the table paginates
 *  client-side from this same array (see VitalsTable), so this is also the
 *  most rows a single "This Month"/custom range can show today. */
const FETCH_LIMIT = 200;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Patient-facing vitals page: date-range filter, trend charts, and a full
 * records table, all driven by one shared query.
 *
 * @param patientId - FHIR Patient.id to scope the query to.
 * @param userId - Better Auth userId, passed alongside patientId.
 * @param orgId - Active organization id.
 */
export function PatientVitalsPage({ patientId, userId, orgId }: PatientVitalsPageProps) {
  const [preset, setPreset] = useState<VitalsDatePreset>("week");
  const [range, setRange] = useState<VitalsDateRange>(() => resolvePreset("week"));

  const handleFilterChange = (nextPreset: VitalsDatePreset, nextRange: VitalsDateRange) => {
    setPreset(nextPreset);
    setRange(nextRange);
  };

  const { data, isLoading, isFetching, error } = useServerActionQuery(listVitalsAction, {
    input: {
      payload: {
        patient_id: patientId,
        user_id: userId,
        recorded_at_from: range.from.toISOString(),
        recorded_at_to: range.to.toISOString(),
        limit: FETCH_LIMIT,
        offset: 0,
      },
    },
    queryKey: ["patient-vitals", patientId, range.from.getTime(), range.to.getTime()],
    enabled: !!patientId,
  });

  const entries = useMemo(() => data?.data ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Vitals</h1>
        <p className="text-sm text-muted-foreground">
          {formatDisplayDate(range.from)} – {formatDisplayDate(range.to)}
        </p>
      </div>

      <VitalsDateRangeFilter preset={preset} range={range} onChange={handleFilterChange} />

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="flex h-24 items-center justify-center text-center text-sm text-destructive">
            Couldn&apos;t load vitals: {error.message}
          </CardContent>
        </Card>
      ) : !isLoading && entries.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
            No vitals recorded in this range.
          </CardContent>
        </Card>
      ) : (
        <VitalsCharts entries={entries} />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Vitals Records</CardTitle>
        </CardHeader>
        <CardContent>
          <VitalsTable entries={entries} loading={isLoading || isFetching} />
        </CardContent>
      </Card>
    </div>
  );
}
