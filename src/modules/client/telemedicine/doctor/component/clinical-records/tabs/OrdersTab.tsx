/**
 * OrdersTab — ServiceRequest editor plus result uploads and patient results.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Two sections:
 *   1. Orders — the ServiceRequestList editor (part of the publishable draft).
 *   2. Results — one row per *published* order showing every file uploaded
 *      against it, whoever uploaded it, with download links and an Upload
 *      button that opens the doctor's UploadOrderResultModal.
 *
 * Only published orders (those with a fhirId) can carry results: a
 * DiagnosticReport must reference a real ServiceRequest, which does not exist
 * until the draft is published. Unpublished orders show a hint instead.
 *
 * The DiagnosticReport → ServiceRequest cross-reference mirrors the patient-side
 * MedicalRecordsClient so both sides resolve uploads identically.
 */

"use client";

import { useMemo } from "react";
import { Download, FileText, FlaskConical, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClinicalEntryList } from "../entries/ClinicalEntryList";
import { ServiceRequestFields } from "../entries/fields/ServiceRequestFields";
import { serviceRequestSummary } from "../entries/summaries";
import { doctorStore } from "../../../stores/doctor.store";
import type { ServiceRequestFormItem } from "../../appointment-review/types";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

// ── Blank-entry factory ───────────────────────────────────────────────────────

/** Creates a blank order. LOINC is the default system for tests. */
function emptyServiceRequest(): ServiceRequestFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "LOINC",
    status: "active",
    intent: "order",
  };
}

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
 * @param title - Filename, e.g. "blood-test.pdf".
 * @param contentType - MIME type, e.g. "application/pdf".
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
 * Fetches a short-lived presigned download URL for a FileNest fileId and opens it.
 *
 * @param fileId - FileNest file ID stored as the attachment url.
 * @param title - Filename hint for the browser download dialog.
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
    a.download = title ?? "result";
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

interface OrdersTabProps {
  /** Current service request items. */
  serviceRequests: ServiceRequestFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onServiceRequestsChange: (items: ServiceRequestFormItem[]) => void;
  /** DiagnosticReports for this encounter — used to resolve uploaded results. */
  diagnosticReports: TDiagnosticReportResponse[];
  /** FHIR Patient.id — needed for the upload path and DiagnosticReport subject. */
  patientId: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Orders editor plus the per-order results panel.
 *
 * @param serviceRequests - Current order items.
 * @param onServiceRequestsChange - Order list change handler.
 * @param diagnosticReports - DiagnosticReports for the encounter.
 * @param patientId - FHIR Patient.id.
 */
export function OrdersTab({
  serviceRequests,
  onServiceRequestsChange,
  diagnosticReports,
  patientId,
}: OrdersTabProps) {
  /**
   * Map ServiceRequest.id → the files uploaded against it, flattened out of
   * every DiagnosticReport whose based_on[] points at that order.
   */
  const filesByServiceRequestId = useMemo(() => {
    const map = new Map<
      number,
      {
        url: string | null | undefined;
        title: string | null | undefined;
        contentType: string | null | undefined;
        size: number | null | undefined;
        uploadedAt: string | null | undefined;
      }[]
    >();

    for (const dr of diagnosticReports) {
      for (const ref of dr.based_on ?? []) {
        if (ref.reference_type !== "ServiceRequest" || ref.reference_id == null) {
          continue;
        }
        const existing = map.get(ref.reference_id) ?? [];
        for (const pf of dr.presented_form ?? []) {
          existing.push({
            url: pf.url,
            title: pf.title,
            contentType: pf.content_type,
            size: pf.size,
            uploadedAt: pf.creation ?? dr.created_at,
          });
        }
        map.set(ref.reference_id, existing);
      }
    }
    return map;
  }, [diagnosticReports]);

  /** Only published orders can receive results. */
  const publishedOrders = serviceRequests.filter((s) => s.fhirId != null);
  const unpublishedCount = serviceRequests.length - publishedOrders.length;

  return (
    <div className="space-y-5">
      {/* ── Orders editor ── */}
      <ClinicalEntryList
        items={serviceRequests}
        onChange={onServiceRequestsChange}
        icon={FlaskConical}
        title="Orders & Investigations"
        addLabel="Add order"
        emptyLabel="No orders for this visit."
        createItem={emptyServiceRequest}
        summary={serviceRequestSummary}
        renderFields={(item, onItemChange) => (
          <ServiceRequestFields item={item} onChange={onItemChange} />
        )}
      />

      {/* ── Results per order ── */}
      <Card>
        <CardContent className="px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <p className="text-sm font-semibold">Results</p>
            <span className="ml-auto text-xs text-muted-foreground">
              Uploaded by you or the patient
            </span>
          </div>

          <Separator />

          {publishedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {unpublishedCount > 0
                ? "Publish this record to the EMR before attaching results to its orders."
                : "No orders on this visit."}
            </p>
          ) : (
            <div className="space-y-3">
              {publishedOrders.map((order) => {
                const files = filesByServiceRequestId.get(order.fhirId!) ?? [];

                return (
                  <div
                    key={order.id}
                    className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-medium truncate">
                          {order.display || "Unnamed order"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {files.length === 0
                            ? "No results uploaded yet"
                            : `${files.length} file${files.length > 1 ? "s" : ""}`}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs shrink-0"
                        onClick={() =>
                          doctorStore.getState().onOpen({
                            type: "uploadOrderResult",
                            data: {
                              serviceRequestId: order.fhirId!,
                              serviceRequestCode: order.display,
                              patientFhirId: patientId,
                            },
                          })
                        }
                      >
                        <Upload className="size-3.5" />
                        Upload
                      </Button>
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-1.5">
                        {files.map((f, i) => {
                          const date = f.uploadedAt
                            ? new Date(f.uploadedAt).toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : null;

                          return (
                            <div
                              key={`${f.url ?? "file"}-${i}`}
                              className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                            >
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono shrink-0 min-w-13 justify-center"
                              >
                                {getFileExt(f.title, f.contentType)}
                              </Badge>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate leading-tight">
                                  {f.title ?? "Untitled"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {[formatBytes(f.size), date]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>

                              {f.url && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1.5 text-xs shrink-0"
                                  onClick={() => downloadFile(f.url!, f.title)}
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
                  </div>
                );
              })}

              {unpublishedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unpublishedCount} unpublished order
                  {unpublishedCount > 1 ? "s" : ""} — publish to attach results.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
