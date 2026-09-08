/**
 * PrescriptionsTab — MedicationRequest entries plus a printable Rx sheet.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Two modes over the same list:
 *   Edit    — compact entry rows with a detail drawer per prescription
 *   Preview — a clean, print-friendly sheet the doctor can hand to the patient
 *
 * Preview reads the same state, so what prints is exactly what will publish. It
 * deliberately shows only the fields a pharmacist needs.
 */

"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileCode,
  FileText,
  FileType,
  Loader2,
  Pencil,
  Pill,
  Printer,
  ScrollText,
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
import { ClinicalEntryList } from "../entries/ClinicalEntryList";
import { MedicationFields } from "../entries/fields/MedicationFields";
import { medicationSummary } from "../entries/summaries";
import { downloadPrescription, type PrescriptionExportFormat } from "./exportPrescription";
import { RxPreview } from "./RxPreview";
import type { DocExportMeta } from "../exportDocument";
import type { MedicationFormItem } from "../../appointment-review/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Creates a blank prescription. RxNorm is the default system for drugs. */
function emptyMedication(): MedicationFormItem {
  return {
    id: crypto.randomUUID(),
    display: "",
    terminologySystem: "RXNORM",
    dose: null,
    frequency: null,
    duration: null,
    route: null,
    status: "active",
    intent: "order",
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrescriptionsTabProps {
  /** Current medication items. */
  medications: MedicationFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onMedicationsChange: (items: MedicationFormItem[]) => void;
  /** Writes one medication to the EMR, resolving to its FHIR id. */
  onPersistMedication: (
    item: MedicationFormItem,
    original?: MedicationFormItem,
  ) => Promise<number>;
  /** Removes one medication from the EMR. */
  onDeleteMedication: (item: MedicationFormItem) => Promise<void>;
  /** Letterhead, patient-info and signature details for the printable sheet. */
  meta: DocExportMeta;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Prescription management with an edit/preview toggle.
 *
 * @param props - See PrescriptionsTabProps.
 */
export function PrescriptionsTab({
  medications,
  onMedicationsChange,
  onPersistMedication,
  onDeleteMedication,
  meta,
}: PrescriptionsTabProps) {
  /** False = edit the list, true = show the printable sheet. */
  const [previewing, setPreviewing] = useState(false);
  /** True while a download is being generated — disables the menu trigger. */
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Generates and downloads the prescription sheet in the given format.
   *
   * @param format - "pdf", "word" or "text".
   */
  async function handleDownload(format: PrescriptionExportFormat) {
    setIsExporting(true);
    try {
      await downloadPrescription(format, medications, meta);
    } catch (err) {
      console.error("[PrescriptionsTab] export failed:", err);
      toast.error("Could not generate the file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

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
            Preview prescription
          </Button>
        </div>

        <ClinicalEntryList
          items={medications}
          onChange={onMedicationsChange}
          icon={Pill}
          title="Prescriptions"
          addLabel="Add medication"
          emptyLabel="No prescriptions for this visit."
          createItem={emptyMedication}
          summary={medicationSummary}
          onPersistItem={onPersistMedication}
          onDeleteItem={onDeleteMedication}
          renderFields={(item, onItemChange) => (
            <MedicationFields item={item} onChange={onItemChange} />
          )}
        />
      </div>
    );
  }

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardContent className="space-y-3 px-4 py-3.5">
        <div className="flex items-center gap-2 print:hidden">
          <Pill className="size-4 text-primary" />
          <p className="text-sm font-semibold">Prescription preview</p>

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

        <RxPreview medications={medications} meta={meta} />
      </CardContent>
    </Card>
  );
}
