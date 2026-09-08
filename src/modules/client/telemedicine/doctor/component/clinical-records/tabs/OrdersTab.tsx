/**
 * OrdersTab — orders and investigations, each with its own results attached.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * One section, not two. Orders and their uploaded results were previously split
 * across "Orders & Investigations" and a separate "Results" card that listed
 * every published order again — so a single order appeared twice on one screen,
 * and its result files sat far away from the order they belonged to. They are
 * now the same row: the order, its upload action, and its files together.
 *
 * Only a published order can carry results: a DiagnosticReport must reference a
 * real ServiceRequest, which does not exist until the draft is published. An
 * unpublished order therefore shows why it cannot accept uploads yet rather
 * than an upload button that would fail.
 *
 * The DiagnosticReport → ServiceRequest cross-reference mirrors the
 * patient-side MedicalRecordsClient so both sides resolve uploads identically.
 * File rows render through the shared AttachmentList, which owns the View and
 * Download actions and their presigned-URL handling.
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
  Lock,
  Pencil,
  Printer,
  ScrollText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AttachmentList } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import { ClinicalEntryList } from "../entries/ClinicalEntryList";
import { ServiceRequestFields } from "../entries/fields/ServiceRequestFields";
import { serviceRequestSummary } from "../entries/summaries";
import { doctorStore } from "../../../stores/doctor.store";
import { downloadLabOrder, type LabOrderExportFormat } from "./exportLabOrders";
import { LabOrderPreview } from "./LabOrderPreview";
import type { Attachment } from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import type { DocExportMeta } from "../exportDocument";
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrdersTabProps {
  /** Current service request items. */
  serviceRequests: ServiceRequestFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onServiceRequestsChange: (items: ServiceRequestFormItem[]) => void;
  /** Writes one order to the EMR, resolving to its FHIR id. */
  onPersistServiceRequest: (item: ServiceRequestFormItem) => Promise<number>;
  /** Removes one order from the EMR. */
  onDeleteServiceRequest: (item: ServiceRequestFormItem) => Promise<void>;
  /** DiagnosticReports for this encounter — used to resolve uploaded results. */
  diagnosticReports: TDiagnosticReportResponse[];
  /** FHIR Patient.id — needed for the upload path and DiagnosticReport subject. */
  patientId: number;
  /** FHIR Appointment.id — part of the preview route this tab links into. */
  appointmentId: number;
  /** Active organisation id — forwarded to the staging record registered on upload. */
  orgId?: string;
  /** Session user id — forwarded to the staging record registered on upload. */
  userId?: string;
  /** Letterhead, patient-info and signature details for the printable/downloadable order sheet. */
  meta: DocExportMeta;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Orders editor with per-order result uploads and file lists.
 *
 * @param serviceRequests - Current order items.
 * @param onServiceRequestsChange - Order list change handler.
 * @param diagnosticReports - DiagnosticReports for the encounter.
 * @param patientId - FHIR Patient.id.
 */
export function OrdersTab({
  serviceRequests,
  onServiceRequestsChange,
  onPersistServiceRequest,
  onDeleteServiceRequest,
  diagnosticReports,
  patientId,
  appointmentId,
  orgId,
  userId,
  meta,
}: OrdersTabProps) {
  /** False = edit the order list, true = show the printable order sheet. */
  const [previewing, setPreviewing] = useState(false);
  /** True while a download is being generated — disables the menu trigger. */
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Generates and downloads the lab-request sheet in the given format.
   *
   * @param format - "pdf", "word" or "text".
   */
  async function handleDownload(format: LabOrderExportFormat) {
    setIsExporting(true);
    try {
      await downloadLabOrder(format, serviceRequests, meta);
    } catch (err) {
      console.error("[OrdersTab] export failed:", err);
      toast.error("Could not generate the file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  /**
   * Map ServiceRequest.id → the files uploaded against it, flattened out of
   * every DiagnosticReport whose based_on[] points at that order.
   */
  const filesByServiceRequestId = useMemo(() => {
    const map = new Map<number, Attachment[]>();

    for (const dr of diagnosticReports) {
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
            /* Identifies the file inside its report for the preview link. */
            previewId: pf.id ?? null,
          });
        }
        map.set(ref.reference_id, existing);
      }
    }
    return map;
  }, [diagnosticReports]);

  /** Total files across every order — shown as the section hint. */
  const totalFiles = useMemo(
    () =>
      [...filesByServiceRequestId.values()].reduce(
        (sum, files) => sum + files.length,
        0,
      ),
    [filesByServiceRequestId],
  );

  if (!previewing) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setPreviewing(true)}
          >
            <ScrollText className="size-3.5" />
            Preview order sheet
          </Button>
        </div>

        <ClinicalEntryList
          items={serviceRequests}
          onChange={onServiceRequestsChange}
          icon={FlaskConical}
          title="Orders & Investigations"
          addLabel="Add order"
          emptyLabel="No orders for this visit."
          hint={
            totalFiles > 0
              ? `${totalFiles} result file${totalFiles > 1 ? "s" : ""} attached`
              : undefined
          }
          createItem={emptyServiceRequest}
          summary={serviceRequestSummary}
          onPersistItem={onPersistServiceRequest}
          onDeleteItem={onDeleteServiceRequest}
          renderFields={(item, onItemChange) => (
            <ServiceRequestFields item={item} onChange={onItemChange} />
          )}
          renderRowExtra={(order) => (
            <OrderResults
              order={order}
              files={
                order.fhirId != null
                  ? (filesByServiceRequestId.get(order.fhirId) ?? [])
                  : []
              }
              patientId={patientId}
              appointmentId={appointmentId}
              orgId={orgId}
              userId={userId}
            />
          )}
        />
      </div>
    );
  }

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardContent className="space-y-3 px-4 py-3.5">
        <div className="flex items-center gap-2 print:hidden">
          <FlaskConical className="size-4 text-primary" />
          <p className="text-sm font-semibold">Order sheet preview</p>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setPreviewing(false)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => window.print()}>
                  <Printer className="size-3.5" />
                  Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator className="print:hidden" />

        <LabOrderPreview orders={serviceRequests} meta={meta} />
      </CardContent>
    </Card>
  );
}

// ── Row extra ─────────────────────────────────────────────────────────────────

interface OrderResultsProps {
  /** The order this block hangs off. */
  order: ServiceRequestFormItem;
  /** Files already uploaded against it. */
  files: Attachment[];
  /** FHIR Patient.id — the DiagnosticReport subject. */
  patientId: number;
  /** FHIR Appointment.id — part of the preview route. */
  appointmentId: number;
  /** Active organisation id — forwarded to the staging record registered on upload. */
  orgId?: string;
  /** Session user id — forwarded to the staging record registered on upload. */
  userId?: string;
}

/**
 * Result files and the upload action for one order.
 *
 * @param order - The order.
 * @param files - Its uploaded result files.
 * @param patientId - FHIR Patient.id.
 */
function OrderResults({
  order,
  files,
  patientId,
  appointmentId,
  orgId,
  userId,
}: OrderResultsProps) {
  /* Unpublished: no ServiceRequest exists in FHIR for a DiagnosticReport to
     reference, so say that rather than offer an upload that cannot succeed. */
  if (order.fhirId == null) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Publish this record to attach results to this order.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Labelled so the block reads as this order's results rather than as a
          continuation of the order row above it. */}
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Results
        </p>
        <span className="text-xs text-muted-foreground">
          {files.length === 0
            ? "none uploaded yet"
            : `${files.length} file${files.length > 1 ? "s" : ""}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto h-7 shrink-0 gap-1.5 text-xs"
          onClick={() =>
            doctorStore.getState().onOpen({
              type: "uploadOrderResult",
              data: {
                serviceRequestId: order.fhirId!,
                serviceRequestCode: order.display,
                patientFhirId: patientId,
                orgId,
                userId,
              },
            })
          }
        >
          <Upload className="size-3.5" />
          Upload
        </Button>
      </div>

      {files.length > 0 && (
        <AttachmentList
          attachments={files}
          /* Preview needs both ids: the order proves the file belongs to this
             patient, the attachment id finds it within the order's reports. */
          previewHref={(file) =>
            file.previewId != null && order.fhirId != null
              ? `/bezs/telemedicine/doctor/clinical-records/${patientId}/${appointmentId}` +
                `/analyse?serviceRequest=${order.fhirId}&attachment=${file.previewId}`
              : null
          }
        />
      )}
    </div>
  );
}
