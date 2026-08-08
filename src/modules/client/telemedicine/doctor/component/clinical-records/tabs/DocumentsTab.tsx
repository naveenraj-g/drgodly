/**
 * DocumentsTab — encounter-level documents (referrals, scans, summaries).
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Unlike the Orders tab, these documents are not tied to a ServiceRequest —
 * they are free-standing DocumentReferences attached to the Encounter, for
 * anything the doctor wants on file for the visit.
 *
 * Uploading opens UploadEncounterDocumentModal via the doctor store. The list
 * itself is server-fetched and refreshed with router.refresh() after an upload.
 */

"use client";

import { Download, FileStack, FolderOpen, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { doctorStore } from "../../../stores/doctor.store";
import type { TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a byte count as a human-readable string.
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
 * @param title - Filename.
 * @param contentType - MIME type.
 * @returns Short label for the badge.
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
 * Fetches a presigned download URL for a FileNest fileId and opens it.
 *
 * @param fileId - FileNest file ID stored as attachment.url.
 * @param title - Filename hint for the download dialog.
 */
async function downloadFile(fileId: string, title?: string | null) {
  try {
    const res = await fetch(
      `/api/filenest-download-url?fileId=${encodeURIComponent(fileId)}`,
    );
    if (!res.ok) throw new Error("Failed to get download URL");
    const { url } = (await res.json()) as { url: string };
    const a = document.createElement("a");
    a.href = url;
    a.download = title ?? "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    toast.error("Could not get download link. Try again.");
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  /** DocumentReferences already attached to this encounter. */
  documents: TDocumentReferenceResponse[];
  /** FHIR Patient.id — the document subject and upload path root. */
  patientId: number;
  /** FHIR Encounter.id the uploads attach to, or null when none exists. */
  encounterId: number | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Lists and uploads encounter-level documents.
 *
 * @param documents - Existing DocumentReferences for the encounter.
 * @param patientId - FHIR Patient.id.
 * @param encounterId - FHIR Encounter.id, or null when unavailable.
 */
export function DocumentsTab({
  documents,
  patientId,
  encounterId,
}: DocumentsTabProps) {
  /* Flatten every attachment across all DocumentReferences, newest first. */
  const rows = [...documents]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .flatMap((doc) =>
      (doc.content ?? []).map((c) => ({
        docId: doc.id,
        typeLabel: doc.type_display ?? doc.type_text ?? null,
        description: doc.description ?? null,
        url: c.attachment?.url,
        title: c.attachment?.title,
        contentType: c.attachment?.content_type,
        size: c.attachment?.size,
        uploadedAt: c.attachment?.creation ?? doc.created_at,
      })),
    );

  return (
    <Card>
      <CardContent className="px-4 py-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <FileStack className="size-4 text-primary" />
          <p className="text-sm font-semibold">Documents</p>
          <Badge variant="secondary" className="text-xs font-normal">
            {rows.length}
          </Badge>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 text-xs"
            disabled={encounterId == null}
            onClick={() =>
              doctorStore.getState().onOpen({
                type: "uploadEncounterDocument",
                data: { encounterId: encounterId!, patientFhirId: patientId },
              })
            }
          >
            <Upload className="size-3.5" />
            Upload
          </Button>
        </div>

        <Separator />

        {encounterId == null && (
          <p className="text-sm text-muted-foreground py-2">
            No encounter for this appointment — documents cannot be attached yet.
          </p>
        )}

        {encounterId != null && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <FolderOpen className="size-8 opacity-40" />
            <p className="text-sm">No documents for this visit.</p>
            <p className="text-xs opacity-70">
              Upload referral letters, scans or discharge summaries.
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-1.5">
            {rows.map((row, i) => {
              const date = row.uploadedAt
                ? new Date(row.uploadedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;

              return (
                <div
                  key={`${row.docId}-${i}`}
                  className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5"
                >
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono shrink-0 min-w-13 justify-center"
                  >
                    {getFileExt(row.title, row.contentType)}
                  </Badge>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {row.title ?? "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[row.typeLabel, formatBytes(row.size), date]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  {row.url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs shrink-0"
                      onClick={() => downloadFile(row.url!, row.title)}
                    >
                      <Download className="size-3" />
                      Download
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
