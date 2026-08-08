/**
 * PrescriptionsTab — MedicationRequest editor plus a printable prescription view.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Two modes over the same list:
 *   Edit    — the existing MedicationList editor (terminology, dose, frequency…)
 *   Preview — a clean, print-friendly Rx sheet the doctor can hand to the patient
 *
 * Preview reads the same form state, so what prints is exactly what will be
 * published. It deliberately renders only the fields a pharmacist needs.
 */

"use client";

import { useState } from "react";
import { Pencil, Pill, Printer, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MedicationList } from "../../appointment-review/clinical/medications/MedicationList";
import type { MedicationFormItem } from "../../appointment-review/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves the effective value of a dosage field, preferring the doctor's edit
 * over the AI-suggested original.
 *
 * @param edited - Doctor-edited value, if any.
 * @param original - Original AI/FHIR value.
 * @returns The value to display, or null when neither is set.
 */
function effective(
  edited: string | undefined,
  original: string | null | undefined,
): string | null {
  return edited ?? original ?? null;
}

/**
 * Builds the one-line "Sig" a pharmacist reads: dose, route, frequency, duration.
 *
 * @param item - The medication form item.
 * @returns Assembled sig line, or a placeholder when nothing is recorded.
 */
function buildSig(item: MedicationFormItem): string {
  const parts = [
    effective(item.editedDose, item.dose),
    effective(item.editedRoute, item.route),
    effective(item.editedFrequency, item.frequency),
    effective(item.editedDuration, item.duration),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No dosage recorded";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrescriptionsTabProps {
  /** Current medication items. */
  medications: MedicationFormItem[];
  /** Called with the full updated list on any add/edit/remove. */
  onMedicationsChange: (items: MedicationFormItem[]) => void;
  /** Patient display name — shown on the printable sheet. */
  patientName: string;
  /** Prescribing doctor's display name — shown on the printable sheet. */
  doctorName: string;
  /** Formatted appointment date — shown on the printable sheet. */
  appointmentDate: string | null;
}

// ── Preview ───────────────────────────────────────────────────────────────────

interface RxPreviewProps {
  medications: MedicationFormItem[];
  patientName: string;
  doctorName: string;
  appointmentDate: string | null;
}

/**
 * Print-friendly prescription sheet.
 * `print:` utilities strip the surrounding chrome so only this block prints.
 *
 * @param medications - Medications to list.
 * @param patientName - Patient the Rx is for.
 * @param doctorName - Prescriber.
 * @param appointmentDate - Date of the visit.
 */
function RxPreview({
  medications,
  patientName,
  doctorName,
  appointmentDate,
}: RxPreviewProps) {
  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <ScrollText className="size-8 opacity-40" />
        <p className="text-sm">No prescriptions to preview.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background p-6 space-y-5 print:border-0 print:p-0">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-lg font-semibold tracking-tight">Prescription</p>
          <p className="text-xs text-muted-foreground">
            Patient: <span className="text-foreground">{patientName}</span>
          </p>
          {appointmentDate && (
            <p className="text-xs text-muted-foreground">
              Date: <span className="text-foreground">{appointmentDate}</span>
            </p>
          )}
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-sm font-medium">{doctorName}</p>
          <p className="text-xs text-muted-foreground">Prescriber</p>
        </div>
      </div>

      <Separator />

      {/* Rx lines */}
      <ol className="space-y-4">
        {medications.map((m, i) => (
          <li key={m.id} className="flex gap-3">
            <span className="text-sm font-mono text-muted-foreground pt-0.5">
              {i + 1}.
            </span>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium">{m.display || "Unnamed medication"}</p>
              <p className="text-sm text-muted-foreground">{buildSig(m)}</p>

              {m.patientInstruction && (
                <p className="text-xs text-muted-foreground italic">
                  {m.patientInstruction}
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                {m.dispenseQuantityValue && (
                  <span>
                    Qty: {m.dispenseQuantityValue}
                    {m.dispenseQuantityUnit ? ` ${m.dispenseQuantityUnit}` : ""}
                  </span>
                )}
                {m.dispenseRepeatsAllowed != null && (
                  <span>Refills: {m.dispenseRepeatsAllowed}</span>
                )}
                {m.substitutionAllowed === false && (
                  <span className="font-medium">Do not substitute</span>
                )}
                {m.reasonCode && <span>Indication: {m.reasonCode}</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <Separator />

      <p className="text-[11px] text-muted-foreground">
        Generated from the electronic medical record. Verify all dosages before
        dispensing.
      </p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Prescription management with an edit/preview toggle.
 *
 * @param medications - Current medication items.
 * @param onMedicationsChange - Medication list change handler.
 * @param patientName - Patient name for the printable sheet.
 * @param doctorName - Prescriber name for the printable sheet.
 * @param appointmentDate - Visit date for the printable sheet.
 */
export function PrescriptionsTab({
  medications,
  onMedicationsChange,
  patientName,
  doctorName,
  appointmentDate,
}: PrescriptionsTabProps) {
  /** False = edit the list, true = show the printable sheet. */
  const [previewing, setPreviewing] = useState(false);

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardContent className="px-4 py-3.5 space-y-3">
        <div className="flex items-center gap-2 print:hidden">
          <Pill className="size-4 text-primary" />
          <p className="text-sm font-semibold">Prescriptions</p>
          <Badge variant="secondary" className="text-xs font-normal">
            {medications.length}
          </Badge>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setPreviewing((p) => !p)}
            >
              {previewing ? (
                <>
                  <Pencil className="size-3.5" />
                  Edit
                </>
              ) : (
                <>
                  <ScrollText className="size-3.5" />
                  Preview
                </>
              )}
            </Button>

            {previewing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => window.print()}
              >
                <Printer className="size-3.5" />
                Print
              </Button>
            )}
          </div>
        </div>

        <Separator className="print:hidden" />

        {previewing ? (
          <RxPreview
            medications={medications}
            patientName={patientName}
            doctorName={doctorName}
            appointmentDate={appointmentDate}
          />
        ) : (
          <MedicationList items={medications} onChange={onMedicationsChange} />
        )}
      </CardContent>
    </Card>
  );
}
