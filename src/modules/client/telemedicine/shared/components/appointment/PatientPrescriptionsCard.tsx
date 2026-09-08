/**
 * PatientPrescriptionsCard — read-only prescription sheet for the patient's
 * Doctor Report tab.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Reuses the exact letterhead sheet (RxPreview) and downloader
 * (downloadPrescription) the doctor's Clinical Records Prescriptions tab
 * already builds — the patient sees the same document, just without any edit
 * affordance: this file never imports ClinicalEntryList or MedicationFields,
 * so there is no edit mode to have hidden in the first place.
 *
 * medicationFromFhir bridges the gap between the raw FHIR API shape this page
 * fetches and the MedicationFormItem shape RxPreview/downloadPrescription
 * expect — the same converter the doctor's Clinical Records workspace uses to
 * seed its own editable state from saved records.
 */

"use client";

import { useState } from "react";
import { ChevronDown, Download, FileCode, FileText, FileType, Loader2, Pill } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { medicationFromFhir } from "@/modules/client/telemedicine/doctor/component/appointment-review/fromFhir";
import { downloadPrescription } from "@/modules/client/telemedicine/doctor/component/clinical-records/tabs/exportPrescription";
import { RxPreview } from "@/modules/client/telemedicine/doctor/component/clinical-records/tabs/RxPreview";
import type { PrescriptionExportFormat } from "@/modules/client/telemedicine/doctor/component/clinical-records/tabs/exportPrescription";
import type { DocExportMeta } from "@/modules/client/telemedicine/doctor/component/clinical-records/exportDocument";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientPrescriptionsCardProps {
  /** Confirmed FHIR MedicationRequests for this encounter. */
  medications: TMedicationRequestResponse[];
  /** Letterhead, patient-info and signature details for the sheet. */
  meta: DocExportMeta;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Read-only prescription sheet with a PDF/Word/plain-text download menu.
 *
 * @param medications - Confirmed FHIR MedicationRequests.
 * @param patientName - Patient display name.
 * @param doctorName - Prescriber display name.
 * @param appointmentDate - Formatted visit date.
 */
export function PatientPrescriptionsCard({
  medications,
  meta,
}: PatientPrescriptionsCardProps) {
  /** True while a download is being generated — disables the menu trigger. */
  const [isExporting, setIsExporting] = useState(false);

  const items = medications.map(medicationFromFhir);

  /**
   * Generates and downloads the prescription sheet in the given format.
   *
   * @param format - "pdf", "word" or "text".
   */
  async function handleDownload(format: PrescriptionExportFormat) {
    setIsExporting(true);
    try {
      await downloadPrescription(format, items, meta);
    } catch (err) {
      console.error("[PatientPrescriptionsCard] export failed:", err);
      toast.error("Could not generate the file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <Pill className="size-4 text-primary" />
          <p className="text-sm font-semibold">Prescription</p>

          {items.length > 0 && (
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

        <RxPreview medications={items} meta={meta} />
      </CardContent>
    </Card>
  );
}
