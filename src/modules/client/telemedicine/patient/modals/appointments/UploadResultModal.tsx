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
 * FHIR records created per upload session (on Upload button click):
 *   • ONE DiagnosticReport  — basedOn: ServiceRequest, presentedForm[]: one entry per file.
 *   • ONE DocumentReference — per file, content[0].attachment.url = fileId,
 *                             context.related: [DiagnosticReport, ServiceRequest].
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
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Lifecycle status of a file in the staging list. */
type FileStatus = "staged" | "uploading" | "done" | "error";

/** A locally staged file plus its current upload status. */
interface StagedEntry {
  /** Unique ID — avoids key collisions for same-named files. */
  id: string;
  file: File;
  status: FileStatus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a byte count as a human-readable string (B / KB / MB).
 *
 * @param bytes - Raw byte count.
 */
function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Derives a short uppercase extension label from filename or MIME type.
 *
 * @param title       - Filename, e.g. "blood-test.pdf".
 * @param contentType - MIME type, e.g. "application/pdf".
 */
function getFileExt(
  title?: string | null,
  contentType?: string | null,
): string {
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
 * Reads sizeBytes from a FileRecord — handles the SDK snake_case / camelCase mismatch.
 * The SDK's final file-record fetch uses raw fetch, so runtime keys are snake_case
 * despite the TS type declaring camelCase.
 *
 * @param record - FileRecord from @filenest/react.
 */
function getSizeBytes(record: FileRecord): number {
  const raw = record as unknown as Record<string, unknown>;
  return (record.sizeBytes ?? raw["size_bytes"] ?? 0) as number;
}

/**
 * Reads contentType from a FileRecord — handles the SDK snake_case / camelCase mismatch.
 *
 * @param record - FileRecord from @filenest/react.
 */
function getContentType(record: FileRecord): string {
  const raw = record as unknown as Record<string, unknown>;
  return (record.contentType ?? raw["content_type"] ?? "") as string;
}

// ── FileRow — single row in the staging / upload-progress list ────────────────

interface FileRowProps {
  entry: StagedEntry;
  /** Remove callback — only shown for staged (not yet uploading) entries. */
  onRemove?: () => void;
}

/**
 * One row in the staged-files list showing name, size, and status icon.
 *
 * @param entry    - Staged file entry with current status.
 * @param onRemove - Called when the × button is clicked (staged entries only).
 */
function FileRow({ entry, onRemove }: FileRowProps) {
  const ext = getFileExt(entry.file.name, entry.file.type);
  const size = formatBytes(entry.file.size);

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5">
      {/* Extension badge */}
      <Badge
        variant="secondary"
        className="text-[10px] font-mono shrink-0 min-w-[3.25rem] justify-center"
      >
        {ext}
      </Badge>

      {/* Filename + size */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">{entry.file.name}</p>
        {size && (
          <p className="text-xs text-muted-foreground mt-0.5">{size}</p>
        )}
      </div>

      {/* Status indicator */}
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
  /** DiagnosticReports filtered to this ServiceRequest. */
  reports: TDiagnosticReportResponse[];
  isLoading: boolean;
  /**
   * Called when the patient clicks Download on a file.
   * @param fileId - FilNest file ID stored as presented_form[].url.
   * @param title  - Original filename for the download prompt.
   */
  onDownload: (fileId: string, title?: string | null) => void;
}

/**
 * Lists previously uploaded result files grouped from DiagnosticReport.presentedForm[].
 * Shows filename, size, upload date, and a per-file Download button.
 *
 * @param reports    - DiagnosticReports for this ServiceRequest.
 * @param isLoading  - True while FHIR data is being fetched.
 * @param onDownload - Download handler.
 */
function ExistingUploads({ reports, isLoading, onDownload }: ExistingUploadsProps) {
  /** Flatten presentedForm entries from all DiagnosticReports, newest first. */
  const allFiles = [...reports]
    .sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    )
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
              {/* Extension badge */}
              <Badge
                variant="secondary"
                className="text-[10px] font-mono shrink-0 min-w-[3.25rem] justify-center"
              >
                {ext}
              </Badge>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">
                  {pf.title ?? "Untitled"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[size, date].filter(Boolean).join(" · ")}
                </p>
              </div>

              {/* Download button */}
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
  onClose: () => void;
}

/**
 * Inner content component rendered inside FileNestProvider.
 * Manages file staging, upload coordination, and FHIR record creation.
 *
 * @param serviceRequestId   - FHIR ServiceRequest.id to link results to.
 * @param patientFhirId      - FHIR Patient.id — used for subject and history fetch.
 * @param serviceRequestCode - Human-readable order name shown in the UI.
 * @param onClose            - Closes the parent modal.
 */
function UploadResultContent({
  serviceRequestId,
  patientFhirId,
  onClose,
}: UploadResultContentProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Staged file list state ──────────────────────────────────────────────────

  const [stagedFiles, setStagedFiles] = useState<StagedEntry[]>([]);

  // ── Upload coordination refs (mutated inside callbacks, no re-render needed) ─

  /** FileNest records collected as onComplete fires per file. */
  const completedRecordsRef = useRef<FileRecord[]>([]);
  /** Total files in the current upload batch. */
  const uploadTotalRef = useRef(0);
  /** How many files have called back (done or error) so far. */
  const uploadCompletedRef = useRef(0);

  // ── FHIR state ─────────────────────────────────────────────────────────────

  const [isSaving, setIsSaving] = useState(false);
  const [existingReports, setExistingReports] = useState<TDiagnosticReportResponse[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // ── Fetch existing DiagnosticReports for this ServiceRequest ─────────────────

  /**
   * Fetches DiagnosticReports filtered by patient_id, then filters client-side by
   * based_on[].reference_id === serviceRequestId. This is necessary because the
   * fhir-server list endpoint does not support a based_on filter.
   */
  const fetchExistingReports = useCallback(async () => {
    if (!patientFhirId || !serviceRequestId) return;
    setIsLoadingReports(true);
    try {
      const [page] = await listDiagnosticReportsAction({
        payload: { patient_id: patientFhirId, limit: 100 },
      });
      if (page?.data) {
        const filtered = page.data.filter((dr) =>
          dr.based_on?.some(
            (b) =>
              b.reference_type === "ServiceRequest" &&
              b.reference_id === serviceRequestId,
          ),
        );
        setExistingReports(filtered);
      }
    } finally {
      setIsLoadingReports(false);
    }
  }, [patientFhirId, serviceRequestId]);

  /** Fetch on mount (UploadResultContent mounts only when the modal is open). */
  useEffect(() => {
    void fetchExistingReports();
  }, [fetchExistingReports]);

  // ── Download handler ────────────────────────────────────────────────────────

  /**
   * Fetches a short-lived presigned URL for a FilNest file and opens it in a new tab.
   *
   * @param fileId - FilNest file ID stored as presented_form[].url.
   * @param title  - Original filename (used as download filename hint).
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
   * After all files are uploaded to FilNest, creates:
   *   • ONE DiagnosticReport with all files in presented_form[].
   *   • ONE DocumentReference per file (linked to the DiagnosticReport + ServiceRequest).
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

        // ── 1. One DiagnosticReport with all files in presented_form[] ─────────
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
            `${records.length - failCount}/${records.length} document references saved. Some failed — check your connection and try again.`,
          );
        } else {
          toast.success(
            `${records.length} file${records.length > 1 ? "s" : ""} uploaded and saved to records.`,
          );
        }

        // Refresh the previous-uploads section and clear the staging list.
        await fetchExistingReports();
        setStagedFiles([]);
        completedRecordsRef.current = [];
      } finally {
        setIsSaving(false);
      }
    },
    [serviceRequestId, patientFhirId, fetchExistingReports],
  );

  // ── FileNest upload callbacks ───────────────────────────────────────────────

  /**
   * Called by useUpload once per completed file.
   * When all files in the batch have completed, triggers FHIR record creation.
   *
   * @param fileRecord - Completed FileRecord from FilNest.
   */
  const handleComplete = useCallback(
    async (fileRecord: FileRecord) => {
      completedRecordsRef.current.push(fileRecord);
      uploadCompletedRef.current++;

      if (uploadCompletedRef.current === uploadTotalRef.current) {
        // All files uploaded — mark done and create FHIR records.
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
   * Called by useUpload when a file fails to upload.
   * Marks the file as errored; if some files succeeded, still creates FHIR records for them.
   *
   * @param error - The upload error.
   */
  const handleError = useCallback(
    async (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      uploadCompletedRef.current++;

      // Mark one uploading entry as error (FIFO — first uploading entry found).
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

      // If some files already completed successfully, still save those to FHIR.
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

  // ── File input handler ──────────────────────────────────────────────────────

  /**
   * Appends newly selected files to the staging list.
   * Files with "uploading" or "done" status are preserved — the patient can
   * add more files before the current batch finishes only while staged.
   *
   * @param e - Change event from the hidden file input.
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

  // ── Upload button handler ───────────────────────────────────────────────────

  /**
   * Starts uploading all staged (not yet uploading) files.
   * Resets upload tracking refs before calling upload().
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

      {/* Divider between existing and new upload sections */}
      {(hasExisting || isLoadingReports) && <Separator />}

      {/* ── New upload section ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Upload New Files
        </p>

        {/* Add files trigger */}
        <button
          type="button"
          onClick={() => !isLoading && inputRef.current?.click()}
          disabled={isLoading}
          className="w-full flex items-center gap-2.5 rounded-md border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/40 hover:border-border hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Select files to stage"
        >
          <Plus className="size-4 shrink-0" />
          <span>Add files</span>
          <span className="ml-auto text-xs text-muted-foreground/60">
            Any type · max 50 MB each
          </span>
        </button>

        {/* Staged / in-progress file list */}
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

        {/* Empty state when nothing is staged yet and no existing */}
        {!showStagingList && !hasExisting && !isLoadingReports && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <FileText className="size-8 opacity-40" />
            <p className="text-sm">No results uploaded yet.</p>
            <p className="text-xs opacity-70">
              Add files above and click Upload.
            </p>
          </div>
        )}

        {/* Upload button — shown only when staged files exist */}
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

        {/* Saving indicator — shown while creating FHIR records */}
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Saving to medical records…
          </div>
        )}
      </div>

      {/* Hidden multi-file input — no accept restriction */}
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
 * serviceRequestId is known — the token endpoint is never called just by having
 * the provider exist in the layout.
 */
export function UploadResultModal() {
  const isOpen = usePatientStore((s) => s.isOpen);
  const type = usePatientStore((s) => s.type);
  const data = usePatientStore((s) => s.data);
  const onClose = usePatientStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only active when this specific modal type is set. */
  const open = isOpen && type === "uploadResult";

  const serviceRequestId = data?.serviceRequestId;
  const patientFhirId = data?.patientFhirId;
  const serviceRequestCode = data?.serviceRequestCode;

  /**
   * FilNest upload path: patientId is the root folder (same convention as profile photos).
   * Falls back gracefully when patientFhirId is unavailable.
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
         * UploadResultContent is conditionally mounted so state resets cleanly
         * each time the modal opens for a different ServiceRequest. FileNestProvider
         * wraps only the content — the token request is deferred until upload() is called.
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
              onClose={onClose}
            />
          </FileNestProvider>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
