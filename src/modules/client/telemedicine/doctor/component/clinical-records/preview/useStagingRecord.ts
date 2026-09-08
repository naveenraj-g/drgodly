/**
 * useStagingRecord — resolves the AI extraction staging record for one file.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * The staging-area pipeline runs asynchronously — a record can still be
 * "pending" or "processing" at the moment the doctor opens the analyse page.
 * This polls at a short interval while that's true and stops once the record
 * lands on a terminal state ("completed" / "failed"), or when no record
 * exists at all (nothing will make one appear without a fresh upload).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listStagingMedicalRecordsAction } from "@/modules/server/presentation/actions/staging-medical-record";
import type { TStagingMedicalRecordResponse } from "@/modules/entities/schemas/staging-medical-record";

/** How often to re-check while the pipeline is still working on the file. */
const POLL_INTERVAL_MS = 4000;

interface UseStagingRecordResult {
  /** The staging record for this file, or null when none has been registered. */
  record: TStagingMedicalRecordResponse | null;
  /** True only for the very first fetch — poll refreshes don't flip this back on. */
  isLoading: boolean;
  /** Re-fetches immediately — used after a review action changes server state. */
  refetch: () => void;
}

/**
 * Resolves and (while pending/processing) polls the staging record for a
 * FileNest file id.
 *
 * @param fileId - FileNest file id, or null when there's nothing to resolve.
 * @param patientId - FHIR Patient.id — defensive secondary filter alongside file_id.
 */
export function useStagingRecord(
  fileId: string | null,
  patientId: number,
): UseStagingRecordResult {
  const [record, setRecord] = useState<TStagingMedicalRecordResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(fileId != null);
  /** Bumped to force the effect to re-run immediately (e.g. after Accept/Reject). */
  const [refetchKey, setRefetchKey] = useState(0);
  const hasLoadedOnceRef = useRef(false);

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!fileId) {
      setRecord(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      const [page] = await listStagingMedicalRecordsAction({
        payload: { file_id: fileId!, patient_id: patientId, limit: 1 },
      });
      if (cancelled) return;

      const next = page?.data?.[0] ?? null;
      setRecord(next);
      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        setIsLoading(false);
      }

      const stillWorking =
        next != null &&
        (next.status === "pending" || next.status === "processing");
      if (stillWorking) {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fileId, patientId, refetchKey]);

  return { record, isLoading, refetch };
}
