/**
 * UploadResultModal — multi-file staging, upload, and history viewer for lab/test results.
 *
 * Layer: client / telemedicine / patient / modals / appointments
 *
 * Opens when the patient store's type === "uploadResult".
 * Reads serviceRequestId, serviceRequestCode, and patientFhirId from store data.
 *
 * UI sections:
 *   1. Previously Uploaded — fetched from FHIR on open; each file has a Download button.
 *   2. New Upload — patient stages files locally, reviews the list, then clicks Upload.
 *      Per-file status chips (pending → uploading → done / error) update as FileNest processes.
 *
 * FHIR records created per upload session (when the Upload button is clicked):
 *   • ONE DiagnosticReport  — basedOn: ServiceRequest, presentedForm[]: one entry per file.
 *   • ONE DocumentReference per file — content[0].attachment.url = fileId,
 *                                      context.related: [DiagnosticReport, ServiceRequest].
 *
 * Must be mounted once inside PatientModalProvider.
 */

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { FileNestProvider, useUpload, type FileRecord } from "@filenest/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Loader2,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientStore } from "../../stores/patient.store";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";
import {
  createDiagnosticReportAction,
  listDiagnosticReportsAction,
} from "@/modules/server/presentation/actions/diagnostic-report";
import { createDocumentReferenceAction } from "@/modules/server/presentation/actions/document-reference";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import type {
  TDiagnosticReportResponse,
  TPaginatedDiagnosticReportResponse,
} from "@/modules/entities/schemas/diagnostic-report";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Lifecycle status of a file in the staging list. */
type FileStatus = "staged" | "uploading" | "done" | "error";

/** A locally staged file plus its current upload status. */
interface StagedEntry {
  /** Unique ID — avoids key collisions for same-named files selected in different batches. */
  id: string;
  file: File;
  status: FileStatus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a byte count as a human-readable string.
 * @param bytes - Raw byte count from the file or FHIR record.
 */
function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Derives a short uppercase extension label from filename or MIME type.
 * @param title       - Filename, e.g. "blood-test.pdf".
 * @param contentType - MIME type, e.g. "application/pdf".
 */
function getFileExt(title?: string | null, contentType?: string | null): string {
  if (title) {
    const ext = title.split(".").pop();
    if (ext && ext.length <= 5) return ext.toUpperCase();
  }
  if (contentType) {
    if (contentType.includes("pdf")) return "PDF";
    const sub = contentType.split("/")[1];
    if (sub) return sub.split(";")[0].toUpperCase().slice(0, 5);
  }
  return "FILE";
}

/**
 * Reads sizeBytes from a FileRecord.
 * The FilNest SDK's final record fetch uses raw fetch, so runtime keys are snake_case
 * despite the TS type declaring camelCase.
 */
function getSizeBytes(record: FileRecord): number {
  const raw = record as unknown as Record<string, unknown>;
  return (record.sizeBytes ?? raw["size_bytes"] ?? 0) as number;
}

/**
 * Reads contentType from a FileRecord (same snake_case / camelCase caveat).
 */
function getContentType(record: FileRecord): string {
  const raw = record as unknown as Record<string, unknown>;
  return (record.contentType ?? raw["content_type"] ?? "") as string;
}

// ── FileRow — one entry in the staged / uploading list ───────────────────────

interface FileRowProps {
  entry: StagedEntry;
  /** Remove callback — only shown while the file is still staged (not yet uploading). */
  onRemove?: () => void;
}

/**
 * Renders one row in the staging list: extension badge, filename, size, and status icon.
 * @param entry    - Staged file entry with current status.
 * @param onRemove - Called when the × button is clicked (staged entries only).
 */
function FileRow({ entry, onRemove }: FileRowProps) {
  const ext = getFileExt(entry.file.name, entry.file.type);
  const size = formatBytes(entry.file.size);

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5">
      <Badge variant="secondary" className="text-[10px] font-mono shrink-0 min-w-13 justify-center">
        {ext}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">{entry.file.name}</p>
        {size && <p className="text-xs text-muted-foreground mt-0.5">{size}</p>}
      </div>

      {entry.status === "staged" && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          aria-label={`Remove ${entry.file.name}`}
        >
          <X className="size-4" />
        </button>
      )}
      {entry.status === "uploading" && (
        <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
      )}
      {entry.status === "done" && (
        <CheckCircle2 className="size-4 text-green-500 dark:text-green-400 shrink-0" />
      )}
      {entry.status === "error" && (
        <AlertCircle className="size-4 text-destructive shrink-0" />
      )}
    </div>
  );
}

// ── ExistingUploads — previously uploaded files fetched from FHIR ─────────────

interface ExistingUploadsProps {
  /** DiagnosticReports already filtered to this ServiceRequest. */
  reports: TDiagnosticReportResponse[];
  isLoading: boolean;
  /**
   * Opens a presigned download URL for the given FilNest fileId.
   * @param fileId - FilNest file ID stored as presented_form[].url.
   * @param title  - Filename for the download prompt.
   */
  onDownload: (fileId: string, title?: string | null) => void;
}

/**
 * Lists previously uploaded result files flattened from DiagnosticReport.presentedForm[].
 * Newest DiagnosticReports first. Each row shows extension, filename, size, date, and
 * a Download button.
 */
function ExistingUploads({ reports, isLoading, onDownload }: ExistingUploadsProps) {
  /** Flatten presentedForm across all DRs, newest DR first. */
  const allFiles = [...reports]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .flatMap((dr) =>
      (dr.presented_form ?? []).map((pf) => ({
        ...pf,
        uploadedAt: pf.creation ?? dr.created_at,
      })),
    );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    );
  }

  if (!allFiles.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Previously Uploaded ({allFiles.length})
      </p>

      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
        {allFiles.map((pf, i) => {
          const ext = getFileExt(pf.title, pf.content_type);
          const size = formatBytes(pf.size);
          const date = pf.uploadedAt
            ? new Date(pf.uploadedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : null;

          return (
            <div
              key={pf.id ?? i}
              className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5"
            >
              <Badge
                variant="secondary"
                className="text-[10px] font-mono shrink-0 min-w-13 justify-center"
              >
                {ext}
              </Badge>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">
                  {pf.title ?? "Untitled"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[size, date].filter(Boolean).join(" · ")}
                </p>
              </div>

              {pf.url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs shrink-0"
                  onClick={() => onDownload(pf.url!, pf.title)}
                >
                  <Download className="size-3" />
                  Download
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── UploadResultContent — main logic (must be inside FileNestProvider) ─────────

interface UploadResultContentProps {
  serviceRequestId: number;
  patientFhirId?: number;
  serviceRequestCode?: string;
}

/**
 * Inner content rendered inside FileNestProvider.
 * Manages staging, upload coordination, FHIR batch creation, and history display.
 *
 * @param serviceRequestId   - FHIR ServiceRequest.id.
 * @param patientFhirId      - FHIR Patient.id — used for subject refs and history fetch.
 * @param serviceRequestCode - Human-readable order name shown in the dialog description.
 */
function UploadResultContent({
  serviceRequestId,
  patientFhirId,
}: UploadResultContentProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Staged file list ────────────────────────────────────────────────────────
  const [stagedFiles, setStagedFiles] = useState<StagedEntry[]>([]);

  // ── Upload coordination refs ────────────────────────────────────────────────
  /** FileNest records collected as onComplete fires sequentially per file. */
  const completedRecordsRef = useRef<FileRecord[]>([]);
  /** Total files in the current upload batch. */
  const uploadTotalRef = useRef(0);
  /** How many files have called back (success or error) so far. */
  const uploadCompletedRef = useRef(0);

  // ── FHIR state ──────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [existingReports, setExistingReports] = useState<TDiagnosticReportResponse[]>([]);
  /**
   * Incrementing this key re-triggers the fetch effect.
   * Increment after a successful FHIR write to refresh the history section.
   */
  const [refreshKey, setRefreshKey] = useState(0);
  /** True while the initial (or refresh) fetch is in flight. */
  const [isLoadingReports, setIsLoadingReports] = useState(
    patientFhirId != null && serviceRequestId != null,
  );

  // ── Fetch existing DiagnosticReports ────────────────────────────────────────
  /**
   * Fetches DiagnosticReports by patient_id, then filters client-side to those
   * whose based_on[] references this ServiceRequest.
   * This pattern avoids calling setState synchronously in the effect body — all
   * state mutations happen inside promise callbacks (async, not synchronous).
   */
  useEffect(() => {
    if (!patientFhirId || !serviceRequestId) return;

    let current = true;

    (
      listDiagnosticReportsAction({
        payload: { patient_id: patientFhirId, limit: 100 },
      }) as Promise<[TPaginatedDiagnosticReportResponse | null, unknown]>
    )
      .then(([page]) => {
        if (!current) return;
        if (page?.data) {
          const filtered = page.data.filter((dr: TDiagnosticReportResponse) =>
            dr.based_on?.some(
              (b: { reference_type?: string | null; reference_id?: number | null }) =>
                b.reference_type === "ServiceRequest" &&
                b.reference_id === serviceRequestId,
            ),
          );
          setExistingReports(filtered);
        }
        setIsLoadingReports(false);
      })
      .catch(() => {
        if (current) setIsLoadingReports(false);
      });

    return () => {
      current = false;
    };
  }, [patientFhirId, serviceRequestId, refreshKey]);

  // ── Download handler ────────────────────────────────────────────────────────
  /**
   * Fetches a short-lived presigned download URL for a FilNest fileId and opens it.
   * @param fileId - FilNest file ID stored as presented_form[].url.
   * @param title  - Filename hint for the browser download dialog.
   */
  const handleDownload = useCallback(
    async (fileId: string, title?: string | null) => {
      try {
        const res = await fetch(
          `/api/filenest-download-url?fileId=${encodeURIComponent(fileId)}`,
        );
        if (!res.ok) throw new Error("Failed to get download URL");
        const { url } = (await res.json()) as { url: string };
        const a = document.createElement("a");
        a.href = url;
        a.download = title ?? "result";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        toast.error("Could not get download link. Try again.");
      }
    },
    [],
  );

  // ── FHIR batch creation ─────────────────────────────────────────────────────
  /**
   * Creates FHIR records for a completed upload batch:
   *   • ONE DiagnosticReport with all files in presented_form[].
   *   • ONE DocumentReference per file linked to the DiagnosticReport + ServiceRequest.
   * Increments refreshKey to trigger a history refresh after saving.
   *
   * @param records - All completed FileRecords from the upload batch.
   */
  const createFhirRecords = useCallback(
    async (records: FileRecord[]) => {
      setIsSaving(true);
      try {
        const subject =
          patientFhirId != null ? `Patient/${patientFhirId}` : undefined;
        const creation = new Date().toISOString();

        // ── 1. One DiagnosticReport (all files in presented_form[]) ──────────
        const [drData, drErr] = await createDiagnosticReportAction({
          payload: {
            status: "preliminary",
            ...(subject ? { subject } : {}),
            based_on: [{ reference: `ServiceRequest/${serviceRequestId}` }],
            presented_form: records.map((r) => ({
              url: r.id,
              content_type: getContentType(r),
              title: r.filename,
              size: getSizeBytes(r),
              creation,
            })),
          },
        });

        if (drErr) {
          handleZSAError({
            err: drErr,
            fallbackMessage: "Failed to create diagnostic report",
          });
          return;
        }

        // ── 2. One DocumentReference per file ─────────────────────────────────
        const drId = drData?.id;
        const related = [
          ...(drId != null ? [{ reference: `DiagnosticReport/${drId}` }] : []),
          { reference: `ServiceRequest/${serviceRequestId}` },
        ];

        const docRefResults = await Promise.allSettled(
          records.map((r) =>
            createDocumentReferenceAction({
              payload: {
                status: "current",
                ...(subject ? { subject } : {}),
                content: [
                  {
                    attachment: {
                      url: r.id,
                      content_type: getContentType(r),
                      title: r.filename,
                      size: getSizeBytes(r),
                      creation,
                    },
                  },
                ],
                context: { related },
              },
            }),
          ),
        );

        const failCount = docRefResults.filter(
          (r) =>
            r.status === "rejected" ||
            (r.status === "fulfilled" && r.value[1]),
        ).length;

        if (failCount > 0) {
          toast.warning(
            `${records.length - failCount}/${records.length} document references saved. Some failed.`,
          );
        } else {
          toast.success(
            `${records.length} file${records.length > 1 ? "s" : ""} uploaded and saved to records.`,
          );
        }

        // Trigger a history refresh and clear the staging list.
        setRefreshKey((k) => k + 1);
        setIsLoadingReports(true);
        setStagedFiles([]);
        completedRecordsRef.current = [];
      } finally {
        setIsSaving(false);
      }
    },
    [serviceRequestId, patientFhirId],
  );

  // ── FileNest upload callbacks ───────────────────────────────────────────────
  /**
   * Called by useUpload once per completed file.
   * When all files in the batch complete, triggers FHIR batch creation.
   */
  const handleComplete = useCallback(
    async (fileRecord: FileRecord) => {
      completedRecordsRef.current.push(fileRecord);
      uploadCompletedRef.current++;

      if (uploadCompletedRef.current === uploadTotalRef.current) {
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.status === "uploading" ? { ...f, status: "done" } : f,
          ),
        );
        await createFhirRecords(completedRecordsRef.current);
      }
    },
    [createFhirRecords],
  );

  /**
   * Called by useUpload when a file fails.
   * Marks one uploading entry as errored. If some files already completed,
   * still creates FHIR records for the successful subset.
   */
  const handleError = useCallback(
    async (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      uploadCompletedRef.current++;

      setStagedFiles((prev) => {
        let marked = false;
        return prev.map((f) => {
          if (!marked && f.status === "uploading") {
            marked = true;
            return { ...f, status: "error" };
          }
          return f;
        });
      });

      if (
        uploadCompletedRef.current === uploadTotalRef.current &&
        completedRecordsRef.current.length > 0
      ) {
        await createFhirRecords(completedRecordsRef.current);
      }
    },
    [createFhirRecords],
  );

  const { upload, isUploading } = useUpload({
    onComplete: handleComplete,
    onError: handleError,
  });

  // ── File input & upload ─────────────────────────────────────────────────────
  /**
   * Appends newly selected files to the staging list.
   * Already-uploading entries are preserved.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setStagedFiles((prev) => [
      ...prev,
      ...files.map((f, i) => ({
        id: `${Date.now()}-${i}-${f.name}`,
        file: f,
        status: "staged" as FileStatus,
      })),
    ]);
  };

  /**
   * Starts uploading all currently staged files.
   * Resets upload tracking refs, marks entries as "uploading", then calls upload().
   */
  const handleUploadClick = () => {
    const toUpload = stagedFiles.filter((f) => f.status === "staged");
    if (!toUpload.length) return;

    completedRecordsRef.current = [];
    uploadTotalRef.current = toUpload.length;
    uploadCompletedRef.current = 0;

    setStagedFiles((prev) =>
      prev.map((f) =>
        f.status === "staged" ? { ...f, status: "uploading" } : f,
      ),
    );
    upload(toUpload.map((e) => e.file));
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const stagedCount = stagedFiles.filter((f) => f.status === "staged").length;
  const isLoading = isUploading || isSaving;
  const hasExisting = existingReports.length > 0;
  const showStagingList = stagedFiles.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Previously uploaded results ──────────────────────────────────── */}
      <ExistingUploads
        reports={existingReports}
        isLoading={isLoadingReports}
        onDownload={handleDownload}
      />

      {(hasExisting || isLoadingReports) && <Separator />}

      {/* ── New upload section ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Upload New Files
        </p>

        {/* Add-files trigger */}
        <button
          type="button"
          onClick={() => !isLoading && inputRef.current?.click()}
          disabled={isLoading}
          className="w-full flex items-center gap-2.5 rounded-md border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/40 hover:border-border hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Select files to stage"
        >
          <Plus className="size-4 shrink-0" />
          <span>Add files</span>
          <span className="ml-auto text-xs opacity-50">Any type · max 50 MB each</span>
        </button>

        {/* Staged / uploading file list */}
        {showStagingList && (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            {stagedFiles.map((entry) => (
              <FileRow
                key={entry.id}
                entry={entry}
                onRemove={
                  entry.status === "staged"
                    ? () =>
                        setStagedFiles((prev) =>
                          prev.filter((f) => f.id !== entry.id),
                        )
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {/* Empty state — nothing staged and no previous uploads */}
        {!showStagingList && !hasExisting && !isLoadingReports && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <FileText className="size-8 opacity-40" />
            <p className="text-sm">No results uploaded yet.</p>
            <p className="text-xs opacity-60">Add files above, then click Upload.</p>
          </div>
        )}

        {/* Upload button — visible only while staged files exist and not actively uploading */}
        {stagedCount > 0 && !isLoading && (
          <Button
            type="button"
            onClick={handleUploadClick}
            className="w-full gap-2"
          >
            <Upload className="size-4" />
            Upload {stagedCount} file{stagedCount > 1 ? "s" : ""}
          </Button>
        )}

        {/* Saving indicator */}
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Saving to medical records…
          </div>
        )}
      </div>

      {/* Hidden multi-file input — no type restriction */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ── UploadResultModal — outer wrapper (store + FileNestProvider) ───────────────

/**
 * Self-contained upload result dialog.
 * Reads the target ServiceRequest from the patient store — no external props needed.
 * Mounted once in PatientModalProvider.
 *
 * FileNestProvider is conditionally mounted only while the modal is open and
 * serviceRequestId is known — no token request fires just from the modal existing
 * in the layout tree.
 */
export function UploadResultModal() {
  const isOpen = usePatientStore((s) => s.isOpen);
  const type = usePatientStore((s) => s.type);
  const data = usePatientStore((s) => s.data);
  const onClose = usePatientStore((s) => s.onClose);
  const queryClient = useQueryClient();

  const open = isOpen && type === "uploadResult";

  const serviceRequestId = data?.serviceRequestId;
  const patientFhirId = data?.patientFhirId;
  const serviceRequestCode = data?.serviceRequestCode;

  /**
   * FilNest upload path: patientId is the root folder (same convention as profile photos:
   * {patientId}/...). Falls back gracefully when patientFhirId is unavailable.
   */
  const filePath =
    patientFhirId != null && serviceRequestId != null
      ? `${patientFhirId}/servicerequest/${serviceRequestId}`
      : serviceRequestId != null
        ? `servicerequest/${serviceRequestId}`
        : "uploads/results";

  const tokenFetcher = useFileNestTokenFetcher({
    filePath,
    maxSizeMb: 50,
    maxFiles: 10,
    metadata: { serviceRequestId, patientFhirId },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Test Result</DialogTitle>
          <DialogDescription>
            {serviceRequestCode
              ? `Results for: ${serviceRequestCode}`
              : "Upload lab or test result documents for this order."}
          </DialogDescription>
        </DialogHeader>

        {/*
         * UploadResultContent mounts only when the modal is open with a known
         * serviceRequestId — state resets cleanly each time the modal re-opens
         * for a different ServiceRequest. FileNestProvider wraps only this inner
         * content; the token endpoint is not called until upload() is invoked.
         */}
        {open && serviceRequestId != null ? (
          <FileNestProvider
            tokenFetcher={tokenFetcher}
            projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
            baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
            queryClient={queryClient}
          >
            <UploadResultContent
              serviceRequestId={serviceRequestId}
              patientFhirId={patientFhirId ?? undefined}
              serviceRequestCode={serviceRequestCode ?? undefined}
            />
          </FileNestProvider>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
