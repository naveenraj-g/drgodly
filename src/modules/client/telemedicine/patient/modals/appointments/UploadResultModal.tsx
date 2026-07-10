/**
 * UploadResultModal — patient-facing dialog to upload a lab/test result document.
 *
 * Layer: client / telemedicine / patient / modals / appointments
 *
 * Opens when the patient store's type === "uploadResult". Reads serviceRequestId,
 * serviceRequestCode, and patientFhirId from store data.
 *
 * Upload flow:
 *   1. Patient selects a PDF, PNG, or JPEG file.
 *   2. File is uploaded via FileNest (token scoped to {patientFhirId}/servicerequest/{id}).
 *   3. On completion, a DiagnosticReport is created (basedOn: ServiceRequest, presentedForm: file).
 *   4. A DocumentReference is created linking both resources (context.related).
 *   5. Success toast is shown and the modal closes.
 *
 * The FileNestProvider is conditionally mounted only while the modal is open and
 * serviceRequestId is available, keeping the upload token request lazy.
 *
 * Must be mounted once inside PatientModalProvider.
 */

"use client";

import { useRef, useState, useCallback } from "react";
import { FileNestProvider, useUpload, type FileRecord } from "@filenest/react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePatientStore } from "../../stores/patient.store";
import { useFileNestTokenFetcher } from "@/modules/client/shared/hooks/useFileNestTokenFetcher";
import { createDiagnosticReportAction } from "@/modules/server/presentation/actions/diagnostic-report";
import { createDocumentReferenceAction } from "@/modules/server/presentation/actions/document-reference";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

// ── Inner upload zone (must be a child of FileNestProvider) ──────────────────

interface UploadZoneProps {
  /** FHIR ServiceRequest.id to link the DiagnosticReport and DocumentReference to. */
  serviceRequestId: number;
  /** FHIR Patient.id — used to populate the subject reference on both records. */
  patientFhirId?: number;
  /** Closes the modal after a successful upload. */
  onClose: () => void;
}

/**
 * Upload zone rendered inside FileNestProvider.
 * Uses useUpload from @filenest/react; on completion creates the two FHIR records.
 *
 * @param serviceRequestId - FHIR ServiceRequest id.
 * @param patientFhirId    - FHIR Patient id.
 * @param onClose          - Callback to close the parent modal.
 */
function UploadZone({ serviceRequestId, patientFhirId, onClose }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Called by useUpload when a file finishes uploading to FileNest.
   * Creates a FHIR DiagnosticReport + DocumentReference from the file record,
   * then closes the modal.
   *
   * @param fileRecord - Completed FileRecord from FileNest.
   */
  const handleComplete = useCallback(
    async (fileRecord: FileRecord) => {
      setIsSaving(true);
      try {
        // The SDK's final fetch uses raw fetch (not the camelizing HTTP client),
        // so runtime keys are snake_case despite the TS type saying camelCase.
        const raw = fileRecord as unknown as Record<string, unknown>;
        const contentType = (fileRecord.contentType ?? raw["content_type"] ?? "") as string;
        const sizeBytes = (fileRecord.sizeBytes ?? raw["size_bytes"] ?? 0) as number;
        const creation = new Date().toISOString();

        const subject = patientFhirId != null ? `Patient/${patientFhirId}` : undefined;

        // ── 1. Create DiagnosticReport ─────────────────────────────────────────
        const [drData, drErr] = await createDiagnosticReportAction({
          payload: {
            status: "preliminary",
            ...(subject ? { subject } : {}),
            based_on: [{ reference: `ServiceRequest/${serviceRequestId}` }],
            presented_form: [
              {
                url: fileRecord.id,
                content_type: contentType,
                title: fileRecord.filename,
                size: sizeBytes,
                creation,
              },
            ],
          },
        });

        if (drErr) {
          handleZSAError({ err: drErr, fallbackMessage: "Failed to create diagnostic report" });
          return;
        }

        // ── 2. Create DocumentReference ────────────────────────────────────────
        const drId = drData?.id;
        const related = [
          ...(drId != null ? [{ reference: `DiagnosticReport/${drId}` }] : []),
          { reference: `ServiceRequest/${serviceRequestId}` },
        ];

        const [, docRefErr] = await createDocumentReferenceAction({
          payload: {
            status: "current",
            ...(subject ? { subject } : {}),
            content: [
              {
                attachment: {
                  url: fileRecord.id,
                  content_type: contentType,
                  title: fileRecord.filename,
                  size: sizeBytes,
                  creation,
                },
              },
            ],
            context: { related },
          },
        });

        if (docRefErr) {
          handleZSAError({ err: docRefErr, fallbackMessage: "Failed to save document reference" });
          return;
        }

        toast.success("Result uploaded successfully.");
        onClose();
      } finally {
        setIsSaving(false);
      }
    },
    [serviceRequestId, patientFhirId, onClose],
  );

  const handleError = useCallback((error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  }, []);

  const { upload, isUploading } = useUpload({
    onComplete: handleComplete,
    onError: handleError,
  });

  const isLoading = isUploading || isSaving;

  /**
   * Triggered when the patient selects one or more files from the hidden input.
   * Passes all selected files to upload() — FileNest processes them sequentially,
   * calling onComplete once per file.
   * Clears the input value so the same files can be re-selected after an error.
   *
   * @param e - Change event from the file input.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    e.target.value = "";
    upload(Array.from(files));
  };

  // ── Status label ─────────────────────────────────────────────────────────────
  const statusLabel = isSaving
    ? "Saving to records…"
    : isUploading
      ? "Uploading…"
      : "Click to select files";

  return (
    <div className="space-y-3">
      {/* Clickable upload zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="w-full rounded-lg border-2 border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center hover:bg-muted/50 hover:border-primary/40 transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Upload result file"
      >
        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <Loader2 className="size-8 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="size-8 text-muted-foreground" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">{statusLabel}</p>
            <p className="text-xs text-muted-foreground">
              Any file type · Max 50 MB · Up to 10 files
            </p>
          </div>
        </div>
      </button>

      {/* Hidden file input */}
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

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Self-contained upload result dialog.
 * Reads the target ServiceRequest from the patient store — no external props needed.
 * Mounted once in PatientModalProvider.
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
   * Build the FilNest upload path. patientFhirId is the root folder (same
   * convention as profile photos: {patientId}/...).
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Test Result</DialogTitle>
          <DialogDescription>
            {serviceRequestCode
              ? `Upload the result for: ${serviceRequestCode}`
              : "Upload the lab or test result document."}
          </DialogDescription>
        </DialogHeader>

        {/*
         * FileNestProvider is mounted only while open + serviceRequestId is known.
         * This keeps the token request lazy — no token is fetched just by mounting
         * the modal provider in the layout.
         */}
        {open && serviceRequestId != null ? (
          <FileNestProvider
            tokenFetcher={tokenFetcher}
            projectId={process.env.NEXT_PUBLIC_FILENEST_PROJECT_ID!}
            baseUrl={process.env.NEXT_PUBLIC_FILENEST_API_URL}
            queryClient={queryClient}
          >
            <UploadZone
              serviceRequestId={serviceRequestId}
              patientFhirId={patientFhirId ?? undefined}
              onClose={onClose}
            />
          </FileNestProvider>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
