/**
 * ExtractedDataPanel — review, edit and push what the AI read from the file.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * When a report is uploaded, it's registered with the staging-area service
 * (registerStagingMedicalRecords, called from the upload modals) and an
 * external pipeline reads it and extracts structured clinical data —
 * observations today. Nothing it produces may enter the patient's record
 * unreviewed, so this panel is the gate.
 *
 * Deliberately all-or-nothing rather than per-row approve/reject: nothing on
 * a staging_observation records an individual accept/reject decision, so a
 * partial batch (some rows in, some skipped) would have no durable trail —
 * reopening the file later could show what got pushed, but not what the
 * doctor deliberately left out or why. Editing every row first, then pushing
 * the whole batch in one act, avoids needing that extra bookkeeping: after
 * the push, review_status is a complete answer to "has this file's
 * extraction been dealt with", not a partial one.
 *
 * Pushing writes every row as a real FHIR Observation via persistClinicalEntry
 * (the same write path the Clinical Records workspace itself uses), tied to
 * the same encounter as the source order, then appends each new Observation
 * to the source DiagnosticReport's `result[]` — the field the FHIR R4 spec
 * defines for exactly this link:
 * https://www.hl7.org/fhir/R4/diagnosticreport.html#resource. Once a
 * record's review_status is "accepted", the panel switches to showing those
 * real, already-stored Observations (resolved via DiagnosticReport.result,
 * not by any staging-side id) rather than a dead-end message — the doctor
 * can still open and edit one, which updates the existing record instead of
 * creating a duplicate.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDateTime } from "@/modules/shared/helper";
import {
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { persistClinicalEntry } from "../persistEntry";
import { getObservationByIdAction } from "@/modules/server/presentation/actions/observation/core.actions";
import {
  getDiagnosticReportByIdAction,
  updateDiagnosticReportAction,
} from "@/modules/server/presentation/actions/diagnostic-report";
import {
  reviewStagingMedicalRecordAction,
  updateStagingMedicalRecordAction,
} from "@/modules/server/presentation/actions/staging-medical-record";
import {
  toStagingObservationRow,
  toStoredObservationRow,
  stagingRowToObservationFormItem,
  type StagingObservationRow,
} from "./stagingObservation";
import type { TStagingMedicalRecordResponse } from "@/modules/entities/schemas/staging-medical-record";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

// ── Component ─────────────────────────────────────────────────────────────────

interface ExtractedDataPanelProps {
  /** Filename, named in the header so the panel has context. */
  fileTitle: string | null;
  /** Staging record for this file, or null when none has been registered. */
  record: TStagingMedicalRecordResponse | null;
  /** True only on the very first fetch. */
  isLoading: boolean;
  /** FHIR Patient.id — the subject of every Observation created on push. */
  patientId: number;
  /** Acting practitioner id — recorded as reviewed_by. */
  reviewerId: string;
  /** The Summary tab's in-progress edit, if any — saved alongside push/reject. */
  summaryDraft: string | null;
  /** Called after a review decision is recorded, so the poller picks it up. */
  onReviewed: () => void;
}

/**
 * Review-then-push queue for AI-extracted clinical data.
 *
 * @param props - See ExtractedDataPanelProps.
 */
export function ExtractedDataPanel({
  fileTitle,
  record,
  isLoading,
  patientId,
  reviewerId,
  summaryDraft,
  onReviewed,
}: ExtractedDataPanelProps) {
  const router = useRouter();
  const [rows, setRows] = useState<StagingObservationRow[]>([]);
  /** Id of the row open for editing, or null when none is. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Real, already-pushed Observations for this order — editable, not re-created. */
  const [storedRows, setStoredRows] = useState<StagingObservationRow[]>([]);
  const [isLoadingStored, setIsLoadingStored] = useState(false);
  /** Key of the stored row currently being saved, if any. */
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Re-seed rows when a different record loads, or when this one finishes
  // processing — not on every poll tick, so in-progress edits on an
  // already-completed record survive the next poll.
  useEffect(() => {
    setRows(record?.observations?.map(toStagingObservationRow) ?? []);
    setEditingId(null);
  }, [record?.id, record?.status]);

  // Once pushed, resolve the real Observations this record produced — via
  // the source DiagnosticReport's own result[], per the FHIR spec, not by
  // any staging-side id.
  useEffect(() => {
    if (record?.review_status !== "accepted" || record.diagnostic_report_id == null) {
      setStoredRows([]);
      return;
    }

    let cancelled = false;
    setIsLoadingStored(true);
    const diagnosticReportId = record.diagnostic_report_id;

    (async () => {
      const [dr] = (await getDiagnosticReportByIdAction({
        payload: { id: diagnosticReportId },
      })) as [TDiagnosticReportResponse | null, unknown];
      if (cancelled) return;

      const observationIds = (dr?.result ?? [])
        .filter((ref) => ref.reference_type === "Observation" && ref.reference_id != null)
        .map((ref) => ref.reference_id!);

      const settled = await Promise.allSettled(
        observationIds.map((id) => getObservationByIdAction({ payload: { id } })),
      );
      if (cancelled) return;

      const observations = settled
        .filter(
          (r): r is PromiseFulfilledResult<[TObservationResponse | null, unknown]> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value[0])
        .filter((obs): obs is TObservationResponse => obs != null);

      setStoredRows(observations.map(toStoredObservationRow));
    })().finally(() => {
      if (!cancelled) setIsLoadingStored(false);
    });

    return () => {
      cancelled = true;
    };
  }, [record?.review_status, record?.diagnostic_report_id]);

  /**
   * Applies a patch to one row.
   *
   * @param key - Row to change.
   * @param patch - Fields to overwrite.
   */
  function update(key: string, patch: Partial<StagingObservationRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  /**
   * Writes every row to FHIR, saves the summary edit if any, and records the
   * push decision on the staging record.
   */
  async function handlePush() {
    if (!record) return;
    if (record.encounter_id == null) {
      toast.error(
        "This file isn't linked to a visit encounter, so findings can't be added to the record.",
      );
      return;
    }
    if (rows.length === 0) return;

    setIsSubmitting(true);
    try {
      const ctx = {
        subject: `Patient/${patientId}`,
        encounterId: record.encounter_id,
      };
      const results = await Promise.allSettled(
        rows.map((row) =>
          persistClinicalEntry(
            "observation",
            stagingRowToObservationFormItem(row, record.service_request_id),
            ctx,
          ),
        ),
      );
      const failCount = results.filter((r) => r.status === "rejected").length;
      const newObservationIds = results
        .filter((r): r is PromiseFulfilledResult<number> => r.status === "fulfilled")
        .map((r) => r.value);

      // Link every newly-created Observation onto the source DiagnosticReport's
      // result[] — read-then-merge, since a PATCH replaces the whole array and
      // any results already linked (from a previous push, or another file
      // against the same report) must not be dropped.
      let diagnosticReportLinkError: string | null = null;
      if (newObservationIds.length > 0 && record.diagnostic_report_id != null) {
        const [dr] = (await getDiagnosticReportByIdAction({
          payload: { id: record.diagnostic_report_id },
        })) as [TDiagnosticReportResponse | null, unknown];
        const existingRefs = (dr?.result ?? [])
          .filter((ref) => ref.reference_type != null && ref.reference_id != null)
          .map((ref) => ({
            reference: `${ref.reference_type}/${ref.reference_id}`,
            reference_display: ref.reference_display ?? undefined,
          }));
        const newRefs = newObservationIds.map((id) => ({
          reference: `Observation/${id}`,
        }));

        const [, drErr] = await updateDiagnosticReportAction({
          payload: {
            id: record.diagnostic_report_id,
            result: [...existingRefs, ...newRefs],
          },
        });
        if (drErr) {
          diagnosticReportLinkError =
            (drErr as { message?: string })?.message ?? "Unknown error";
          console.error("DiagnosticReport.result update failed", drErr);
        }
      }

      if (
        summaryDraft != null &&
        summaryDraft.trim() !== (record.summary ?? "").trim()
      ) {
        await updateStagingMedicalRecordAction({
          payload: { id: record.id, summary: summaryDraft },
        });
        // DiagnosticReport.conclusion is the real EMR home for this text —
        // the staging record's own summary field is a review-workflow copy,
        // not part of the patient's chart.
        if (record.diagnostic_report_id != null) {
          await updateDiagnosticReportAction({
            payload: {
              id: record.diagnostic_report_id,
              conclusion: summaryDraft,
            },
          });
        }
      }

      const [, reviewErr] = await reviewStagingMedicalRecordAction({
        payload: {
          id: record.id,
          review_status: "accepted",
          reviewed_by: reviewerId,
        },
      });

      if (failCount > 0) {
        toast.warning(
          `${rows.length - failCount}/${rows.length} findings saved. Some failed.`,
        );
      } else if (diagnosticReportLinkError) {
        toast.warning(
          `Findings saved, but linking them to the report failed: ${diagnosticReportLinkError}`,
        );
      } else if (reviewErr) {
        toast.error("Findings saved, but marking this file reviewed failed.");
      } else {
        toast.success("Findings added to the record.");
      }

      onReviewed();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Rejects the whole batch — nothing is written to FHIR. */
  async function handleReject() {
    if (!record) return;
    setIsSubmitting(true);
    try {
      const [, err] = await reviewStagingMedicalRecordAction({
        payload: {
          id: record.id,
          review_status: "rejected",
          reviewed_by: reviewerId,
        },
      });
      if (err) {
        toast.error("Failed to record the rejection.");
      } else {
        toast.success("Marked as rejected — nothing was added to the record.");
        onReviewed();
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Saves a doctor's edit to an already-stored finding. Routes to
   * updateObservationAction (not create) because the row carries fhirId.
   *
   * @param key - The stored row's key.
   */
  async function handleSaveStored(key: string) {
    const row = storedRows.find((r) => r.key === key);
    if (!row) return;

    setSavingKey(key);
    try {
      await persistClinicalEntry(
        "observation",
        stagingRowToObservationFormItem(row, record?.service_request_id),
        { subject: `Patient/${patientId}`, encounterId: record?.encounter_id ?? 0 },
      );
      toast.success("Finding updated.");
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("Failed to save the change.");
    } finally {
      setSavingKey(null);
    }
  }

  /**
   * Applies a patch to one stored row (local edit, not yet saved).
   *
   * @param key - Row to change.
   * @param patch - Fields to overwrite.
   */
  function updateStored(key: string, patch: Partial<StagingObservationRow>) {
    setStoredRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  // ── States with no editable rows ─────────────────────────────────────────

  if (isLoading) {
    return <StatusNotice icon={<Loader2 className="size-5 animate-spin" />} text="Loading…" />;
  }

  if (!record) {
    return (
      <StatusNotice
        icon={<Sparkles className="size-5 opacity-50" />}
        text="No AI extraction has been registered for this file."
      />
    );
  }

  if (record.status === "pending" || record.status === "processing") {
    return (
      <StatusNotice
        icon={<Loader2 className="size-5 animate-spin" />}
        text="AI is still reading this file — this updates automatically."
      />
    );
  }

  if (record.status === "failed") {
    return (
      <StatusNotice
        icon={<TriangleAlert className="size-5 text-destructive" />}
        text={record.error_message ?? "Extraction failed for this file."}
      />
    );
  }

  if (record.review_status === "rejected") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
        <XCircle className="size-8 opacity-50" />
        <p className="text-sm font-medium text-foreground">
          This file&apos;s AI extraction was rejected.
        </p>
        {record.reviewed_by && (
          <p className="text-xs">
            Reviewed by {record.reviewed_by}
            {record.reviewed_at ? ` on ${formatDisplayDateTime(record.reviewed_at)}` : ""}
          </p>
        )}
      </div>
    );
  }

  if (record.review_status === "accepted") {
    return (
      <div className="flex h-full flex-col">
        {/* ── Context line ── */}
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            Added to the record
            {record.reviewed_by ? ` · reviewed by ${record.reviewed_by}` : ""}
            {record.reviewed_at
              ? ` on ${formatDisplayDateTime(record.reviewed_at)}`
              : ""}
          </p>
        </div>

        {isLoadingStored ? (
          <StatusNotice
            icon={<Loader2 className="size-5 animate-spin" />}
            text="Loading stored findings…"
          />
        ) : storedRows.length === 0 ? (
          <StatusNotice
            icon={<Sparkles className="size-5 opacity-50" />}
            text="No findings from this file are in the record."
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-3">
              {storedRows.map((row) => (
                <ExtractedRow
                  key={row.key}
                  row={row}
                  isEditing={editingId === row.key}
                  onEdit={() => setEditingId(row.key)}
                  onDoneEditing={() => setEditingId(null)}
                  onChange={(patch) => updateStored(row.key, patch)}
                  onSave={() => void handleSaveStored(row.key)}
                  isSaving={savingKey === row.key}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <StatusNotice
        icon={<Sparkles className="size-5 opacity-50" />}
        text={`Nothing was extracted from ${fileTitle ?? "this file"}.`}
      />
    );
  }

  // ── Editable review queue ─────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* ── Queue summary ── */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{rows.length}</span>{" "}
          finding{rows.length > 1 ? "s" : ""} extracted — edit any, then push to the EMR
        </p>
      </div>

      {/* ── Rows ── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {rows.map((row) => (
            <ExtractedRow
              key={row.key}
              row={row}
              isEditing={editingId === row.key}
              onEdit={() => setEditingId(row.key)}
              onDoneEditing={() => setEditingId(null)}
              onChange={(patch) => update(row.key, patch)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* ── Commit bar ──
          All-or-nothing on purpose — see the file header comment for why
          there's no per-row approve/reject. */}
      <div className="flex items-center gap-2 border-t p-3">
        <p className="text-xs text-muted-foreground">
          {rows.length} finding{rows.length > 1 ? "s" : ""} ready to push
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          disabled={isSubmitting}
          onClick={handleReject}
        >
          <X className="size-3.5" />
          Reject file
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          disabled={isSubmitting}
          onClick={handlePush}
        >
          {isSubmitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Push to EMR
        </Button>
      </div>
    </div>
  );
}

// ── Status notice (loading / empty / pending / failed) ──────────────────────

function StatusNotice({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      {icon}
      <p>{text}</p>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface ExtractedRowProps {
  row: StagingObservationRow;
  isEditing: boolean;
  onEdit: () => void;
  onDoneEditing: () => void;
  onChange: (patch: Partial<StagingObservationRow>) => void;
  /** Stored rows only — persists the edit to the existing FHIR Observation. */
  onSave?: () => void;
  /** Stored rows only — true while this row's save is in flight. */
  isSaving?: boolean;
}

/**
 * One extracted value: read it, correct it. No per-row accept/reject — see
 * the file header comment. "stored" rows (already pushed) get a Save button
 * instead of the plain edit toggle, since editing them writes immediately.
 *
 * @param props - See ExtractedRowProps.
 */
function ExtractedRow({
  row,
  isEditing,
  onEdit,
  onDoneEditing,
  onChange,
  onSave,
  isSaving,
}: ExtractedRowProps) {
  return (
    <div className="rounded-md border px-3 py-2.5 transition-colors">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {isEditing ? (
            <Input
              value={row.display}
              onChange={(e) => onChange({ display: e.target.value })}
              className="h-7 text-sm font-medium"
              placeholder="What was measured"
            />
          ) : (
            <p className="truncate text-sm font-medium">{row.display}</p>
          )}

          {/* Value + unit + reference range — each only when populated */}
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={row.value}
                onChange={(e) => onChange({ value: e.target.value })}
                className="h-7 w-24 text-sm"
                placeholder="Value"
              />
              <Input
                value={row.unit}
                onChange={(e) => onChange({ unit: e.target.value })}
                className="h-7 w-24 text-sm"
                placeholder="Unit"
              />
              <Input
                value={row.referenceRange}
                onChange={(e) => onChange({ referenceRange: e.target.value })}
                className="h-7 flex-1 text-sm"
                placeholder="Reference range"
              />
            </div>
          ) : (
            (row.value || row.referenceRange || row.category || row.interpretation) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {row.value && (
                  <span className="font-mono text-sm text-foreground">
                    {row.value}
                    {row.unit && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {row.unit}
                      </span>
                    )}
                  </span>
                )}
                {row.referenceRange && (
                  <span className="text-muted-foreground">
                    ref {row.referenceRange}
                  </span>
                )}
                {row.category && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {row.category}
                  </Badge>
                )}
                {row.outOfRange && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-400/50 text-[10px] font-normal text-amber-700 dark:text-amber-400"
                  >
                    <TriangleAlert className="size-2.5" />
                    {row.interpretation ?? "Out of range"}
                  </Badge>
                )}
              </div>
            )
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex shrink-0 items-center gap-1">
          {row.state === "stored" && (
            <Badge
              variant="secondary"
              className="gap-1 bg-sky-100 text-[10px] font-normal text-sky-800 dark:bg-sky-950 dark:text-sky-300"
            >
              <CheckCircle2 className="size-2.5" />
              In record
            </Badge>
          )}
          {row.state === "stored" && isEditing && (
            <Button
              type="button"
              size="icon"
              className="size-7"
              onClick={onSave}
              disabled={isSaving}
              aria-label="Save change"
              title="Save"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={isEditing ? onDoneEditing : onEdit}
            disabled={isSaving}
            aria-label={isEditing ? "Finish editing" : "Edit entry"}
            title={isEditing ? "Done" : "Edit"}
          >
            {isEditing ? (
              <RotateCcw className="size-3.5" />
            ) : (
              <Pencil className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
