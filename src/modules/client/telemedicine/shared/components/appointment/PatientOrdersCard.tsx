/**
 * PatientOrdersCard — read-only lab/investigation request sheet for the
 * patient's Doctor Report tab, plus per-order result upload.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Reuses the exact letterhead sheet (LabOrderPreview) and downloader
 * (downloadLabOrder) the doctor's Clinical Records Orders tab already builds
 * — the patient sees the same document, just without any edit affordance:
 * this file never imports ClinicalEntryList or ServiceRequestFields, so there
 * is no edit mode to have hidden in the first place.
 *
 * The sheet above covers order *details*; it says nothing about uploaded
 * *result files*, which is a separate, still-necessary capability (the
 * patient needs to attach their lab results). The compact per-order list
 * below the sheet carries only that — upload action + attached files — reusing
 * the same DiagnosticReport → ServiceRequest cross-reference DoctorReportSection
 * already builds for its own ServiceRequestList.
 *
 * serviceRequestFromFhir bridges the raw FHIR API shape this page fetches to
 * the ServiceRequestFormItem shape LabOrderPreview/downloadLabOrder expect —
 * the same converter the doctor's Clinical Records workspace uses to seed its
 * own editable state from saved records.
 */

"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  FileCode,
  FileText,
  FileType,
  FlaskConical,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AttachmentList } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import { serviceRequestFromFhir } from "@/modules/client/telemedicine/doctor/component/appointment-review/fromFhir";
import { downloadLabOrder } from "@/modules/client/telemedicine/doctor/component/clinical-records/tabs/exportLabOrders";
import { LabOrderPreview } from "@/modules/client/telemedicine/doctor/component/clinical-records/tabs/LabOrderPreview";
import type { Attachment } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import type { LabOrderExportFormat } from "@/modules/client/telemedicine/doctor/component/clinical-records/tabs/exportLabOrders";
import type { DocExportMeta } from "@/modules/client/telemedicine/doctor/component/clinical-records/exportDocument";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientOrdersCardProps {
  /** Confirmed FHIR ServiceRequests for this encounter. */
  serviceRequests: TServiceRequestResponse[];
  /** DiagnosticReports for the same encounter — resolves uploaded result files. */
  diagnosticReports: TDiagnosticReportResponse[];
  /** Letterhead, patient-info and signature details for the sheet. */
  meta: DocExportMeta;
  /**
   * Opens the upload-result modal for one order. Omit to hide the Upload
   * button entirely (doctor callers of this component never pass it — only
   * the patient appointment page does).
   */
  onUploadResult?: (sr: TServiceRequestResponse) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Read-only lab-request sheet with a download menu, plus per-order result
 * upload and uploaded-file lists.
 *
 * @param serviceRequests - Confirmed FHIR ServiceRequests.
 * @param diagnosticReports - DiagnosticReports for the same encounter.
 * @param patientName - Patient display name.
 * @param doctorName - Ordering doctor display name.
 * @param appointmentDate - Formatted visit date.
 * @param onUploadResult - Opens the upload-result modal for one order.
 */
export function PatientOrdersCard({
  serviceRequests,
  diagnosticReports,
  meta,
  onUploadResult,
}: PatientOrdersCardProps) {
  /** True while a download is being generated — disables the menu trigger. */
  const [isExporting, setIsExporting] = useState(false);

  const items = useMemo(
    () => serviceRequests.map(serviceRequestFromFhir),
    [serviceRequests],
  );

  /** Map from ServiceRequest.id → uploaded result files, newest DR first. */
  const filesByServiceRequestId = useMemo(() => {
    const map = new Map<number, Attachment[]>();
    const sorted = [...diagnosticReports].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
    for (const dr of sorted) {
      for (const ref of dr.based_on ?? []) {
        if (ref.reference_type !== "ServiceRequest" || ref.reference_id == null) {
          continue;
        }
        const existing = map.get(ref.reference_id) ?? [];
        for (const [index, pf] of (dr.presented_form ?? []).entries()) {
          existing.push({
            key: `${dr.id}-${pf.id ?? index}`,
            fileId: pf.url ?? null,
            title: pf.title ?? null,
            contentType: pf.content_type ?? null,
            size: pf.size ?? null,
            uploadedAt: pf.creation ?? dr.created_at ?? null,
            detail: null,
          });
        }
        map.set(ref.reference_id, existing);
      }
    }
    return map;
  }, [diagnosticReports]);

  /**
   * Generates and downloads the lab-request sheet in the given format.
   *
   * @param format - "pdf", "word" or "text".
   */
  async function handleDownload(format: LabOrderExportFormat) {
    setIsExporting(true);
    try {
      await downloadLabOrder(format, items, meta);
    } catch (err) {
      console.error("[PatientOrdersCard] export failed:", err);
      toast.error("Could not generate the file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" />
          <p className="text-sm font-semibold">Orders &amp; Investigations</p>

          {serviceRequests.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1.5 text-xs"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Download
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => void handleDownload("pdf")}>
                  <FileText className="size-3.5" />
                  PDF
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    .pdf
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleDownload("word")}>
                  <FileType className="size-3.5" />
                  Word
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    .doc
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleDownload("text")}>
                  <FileCode className="size-3.5" />
                  Plain text
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    .txt
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <LabOrderPreview orders={items} meta={meta} />

        {/* Results — upload action + attached files, per order. The sheet
            above already shows every order's details, so this only carries
            what it doesn't: uploads and files. */}
        {serviceRequests.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Results
              </p>
              {serviceRequests.map((sr) => {
                const files = filesByServiceRequestId.get(sr.id) ?? [];
                return (
                  <div key={sr.id} className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {sr.code_display ?? sr.code_text ?? "Unnamed order"}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {files.length === 0
                          ? "none uploaded yet"
                          : `${files.length} file${files.length > 1 ? "s" : ""}`}
                      </span>
                      {onUploadResult && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 gap-1.5 text-xs"
                          onClick={() => onUploadResult(sr)}
                        >
                          <Upload className="size-3.5" />
                          Upload
                        </Button>
                      )}
                    </div>
                    {files.length > 0 && <AttachmentList attachments={files} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
