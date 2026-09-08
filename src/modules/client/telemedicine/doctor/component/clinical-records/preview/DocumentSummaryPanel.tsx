/**
 * DocumentSummaryPanel — AI summary of the document, right of the split.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * Shows the staging record's agent-written summary and lets the doctor edit
 * and save it independently of the Extracted tab — reviewing the summary and
 * reviewing the observations are two separate decisions the doctor can make
 * on their own schedule, so the Save button here is always available, both
 * before and after the observations have been accepted/rejected. (An edit
 * left unsaved when the doctor instead hits Accept on the Extracted tab
 * still rides along with that action, as a convenience — but this button is
 * never the *only* way to save it.)
 *
 * Every save writes twice: StagingMedicalRecord.summary (a review-workflow
 * copy) and, when the source DiagnosticReport is known, its `conclusion`
 * field — the actual FHIR home for this text, and the only one that's part
 * of the patient's real chart.
 *
 * "Reviewed" isn't tracked as a separate flag here — it's derived from
 * whether DiagnosticReport.conclusion has content. Once it does, that's the
 * text this panel treats as current (edits build on the EMR value, not a
 * copy that could drift from it); until then, the box shows the AI's
 * unreviewed draft (StagingMedicalRecord.summary) with a prompt to review
 * and submit it. This mirrors how the Extracted tab derives "already
 * stored" from the real Observations rather than a staging-side flag.
 */

"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Loader2, Pencil, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { updateStagingMedicalRecordAction } from "@/modules/server/presentation/actions/staging-medical-record";
import {
  getDiagnosticReportByIdAction,
  updateDiagnosticReportAction,
} from "@/modules/server/presentation/actions/diagnostic-report";
import type { TStagingMedicalRecordResponse } from "@/modules/entities/schemas/staging-medical-record";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentSummaryPanelProps {
  /** Filename, named in the header so the panel has context. */
  fileTitle: string | null;
  /** The order or document this file belongs to. */
  parentLabel: string;
  /** Staging record for this file, or null when none has been registered. */
  record: TStagingMedicalRecordResponse | null;
  /** True only on the very first fetch. */
  isLoading: boolean;
  /** The doctor's in-progress edit, or null when unedited (falls back to record.summary). */
  summaryDraft: string | null;
  /** Called on every keystroke — lifted to the parent so Accept can read the latest value. */
  onSummaryDraftChange: (value: string) => void;
  /** Called after a direct save here, so the parent can refetch and clear the draft. */
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * AI-generated summary — always editable, saved either via the Extracted
 * tab's review decision or directly with the button here.
 *
 * @param props - See DocumentSummaryPanelProps.
 */
export function DocumentSummaryPanel({
  fileTitle,
  parentLabel,
  record,
  isLoading,
  summaryDraft,
  onSummaryDraftChange,
  onSaved,
}: DocumentSummaryPanelProps) {
  const [isSaving, setIsSaving] = useState(false);

  /** DiagnosticReport.conclusion — null while unresolved or genuinely empty. */
  const [conclusion, setConclusion] = useState<string | null>(null);
  const [isLoadingConclusion, setIsLoadingConclusion] = useState(true);

  useEffect(() => {
    if (!record || record.diagnostic_report_id == null) {
      setConclusion(null);
      setIsLoadingConclusion(false);
      return;
    }

    let cancelled = false;
    setIsLoadingConclusion(true);
    const diagnosticReportId = record.diagnostic_report_id;

    (async () => {
      const [dr] = (await getDiagnosticReportByIdAction({
        payload: { id: diagnosticReportId },
      })) as [TDiagnosticReportResponse | null, unknown];
      if (!cancelled) setConclusion(dr?.conclusion ?? null);
    })().finally(() => {
      if (!cancelled) setIsLoadingConclusion(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, record?.diagnostic_report_id]);

  if (isLoading || isLoadingConclusion) {
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

  /** Reviewed and pushed once the DiagnosticReport actually carries a conclusion. */
  const hasConclusion = conclusion != null && conclusion.trim().length > 0;
  /** What the box builds on: the EMR value once it exists, else the AI's unreviewed draft. */
  const baseline = hasConclusion ? (conclusion as string) : (record.summary ?? "");
  const value = summaryDraft ?? baseline;
  const isDirty = summaryDraft != null && summaryDraft.trim() !== baseline.trim();
  // Enabled on any edit, and also for the very first push of an untouched
  // AI draft — otherwise a doctor who agrees with the draft as-is would have
  // no way to submit it.
  const canSave = isDirty || (!hasConclusion && (record.summary ?? "").trim().length > 0);

  async function handleSave() {
    if (!record) return;
    setIsSaving(true);
    try {
      const [, err] = await updateStagingMedicalRecordAction({
        payload: { id: record.id, summary: value },
      });
      if (err) {
        toast.error("Failed to save the summary.");
        return;
      }

      // DiagnosticReport.conclusion is the real EMR home for this text — the
      // staging record's own summary field is a review-workflow copy, not
      // part of the patient's chart.
      if (record.diagnostic_report_id != null) {
        const [, drErr] = await updateDiagnosticReportAction({
          payload: {
            id: record.diagnostic_report_id,
            conclusion: value,
          },
        });
        if (drErr) {
          toast.warning("Summary saved, but updating the report's conclusion failed.");
          onSaved();
          return;
        }
        setConclusion(value);
      }

      toast.success("Summary saved.");
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          <div className="rounded-md border bg-muted/20 px-3 py-2.5">
            <p className="text-sm font-medium">{fileTitle ?? "This file"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{parentLabel}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Pencil className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
              </h3>
              {isDirty ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  Edited
                </Badge>
              ) : hasConclusion ? (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-sky-100 text-[10px] font-normal text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                >
                  <CheckCircle2 className="size-2.5" />
                  In record
                </Badge>
              ) : (
                record.summary && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-400/50 text-[10px] font-normal text-amber-700 dark:text-amber-400"
                  >
                    <TriangleAlert className="size-2.5" />
                    Needs review
                  </Badge>
                )
              )}
            </div>

            {!hasConclusion && record.summary && !isDirty && (
              <p className="rounded-md border border-dashed border-amber-400/50 bg-amber-50/50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                This is the AI&apos;s draft — review it and press Update to add it to the
                patient&apos;s record.
              </p>
            )}

            <Textarea
              value={value}
              onChange={(e) => onSummaryDraftChange(e.target.value)}
              placeholder="No summary was generated for this file — add one if you'd like."
              className="min-h-32 text-sm leading-relaxed"
            />
          </div>
        </div>
      </ScrollArea>

      {/* Always available — saving the summary is its own decision, separate
          from accepting/rejecting the observations on the Extracted tab. */}
      <div className="flex items-center justify-end border-t p-3">
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          disabled={!canSave || isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Update summary
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
