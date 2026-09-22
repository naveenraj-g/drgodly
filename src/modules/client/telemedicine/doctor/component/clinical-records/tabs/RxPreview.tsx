/**
 * RxPreview — print-friendly, hospital-letterhead prescription sheet.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Pure display component, no edit affordances. Used by PrescriptionsTab's own
 * Preview mode (doctor, editable list elsewhere on the same tab) and by the
 * patient-facing PatientPrescriptionsCard (read-only, no sibling edit mode at
 * all) — extracted here so the second consumer never has to import
 * ClinicalEntryList or anything else edit-related to render this sheet.
 *
 * Letterhead/patient-bar/signature fields all come from `meta` and degrade
 * gracefully — each row is omitted rather than shown blank when its data
 * isn't on file for a given appointment.
 */

import { ScrollText } from "lucide-react";
import { formatDisplayDateTime } from "@/modules/shared/helper";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { effective } from "./exportPrescription";
import type { DocExportMeta } from "../exportDocument";
import type { MedicationFormItem } from "../../appointment-review/types";

/**
 * Print-friendly prescription sheet.
 *
 * @param medications - Medications to list.
 * @param meta - Letterhead, patient-info and signature details.
 */
export function RxPreview({
  medications,
  meta,
}: {
  medications: MedicationFormItem[];
  meta: DocExportMeta;
}) {
  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <ScrollText className="size-8 opacity-40" />
        <p className="text-sm">No prescriptions to preview.</p>
      </div>
    );
  }

  const { organization: org, practitioner: prac, patientInfo } = meta;

  return (
    <div className="space-y-4 rounded-md border bg-background p-6 print:border-0 print:p-0">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          {org ? (
            <>
              <p className="text-lg font-semibold tracking-tight text-primary">
                {org.name}
              </p>
              {org.addressLine && (
                <p className="text-xs text-muted-foreground">{org.addressLine}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {[org.phone, org.email].filter(Boolean).join("  ·  ")}
              </p>
              {org.regNo && (
                <p className="text-xs text-muted-foreground">Reg No: {org.regNo}</p>
              )}
            </>
          ) : (
            <p className="text-lg font-semibold tracking-tight">Prescription</p>
          )}
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-sm font-medium">{meta.doctorName}</p>
          {prac?.qualifications && (
            <p className="text-xs text-muted-foreground">{prac.qualifications}</p>
          )}
          {prac?.specialty && (
            <p className="text-xs text-muted-foreground">{prac.specialty}</p>
          )}
          {prac?.regNo ? (
            <p className="text-xs text-muted-foreground">Reg No: {prac.regNo}</p>
          ) : (
            !org && <p className="text-xs text-muted-foreground">Prescriber</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Badge row */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
          Official Record
        </Badge>
        <Badge className="text-[10px] font-medium uppercase tracking-wide">
          Medical Prescription (Rx)
        </Badge>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {meta.docRef && <span>Doc Ref: {meta.docRef}</span>}
          {meta.appointmentDate && <span>Date: {meta.appointmentDate}</span>}
        </div>
      </div>

      {/* Patient info bar */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border bg-muted/30 px-3 py-2.5 sm:grid-cols-4">
        <InfoCell label="Patient Name" value={meta.patientName} />
        <InfoCell
          label="Age / Gender"
          value={[
            patientInfo?.age != null ? `${patientInfo.age} Yrs` : null,
            patientInfo?.gender,
          ]
            .filter(Boolean)
            .join(" / ") || null}
        />
        <InfoCell label="Mobile" value={patientInfo?.mobile ?? null} />
        <InfoCell label="Patient ID" value={patientInfo?.patientId ?? null} />
      </div>
      {meta.diagnosis && (
        <p className="text-sm">
          <span className="font-medium text-foreground/70">
            Provisional Diagnosis:
          </span>{" "}
          {meta.diagnosis}
        </p>
      )}

      <Separator />

      {/* Medications table */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Prescribed Medications ({medications.length})
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="w-8 py-1.5 pr-2 font-medium">#</th>
                <th className="py-1.5 pr-2 font-medium">Medicine</th>
                <th className="py-1.5 pr-2 font-medium">Dose</th>
                <th className="py-1.5 pr-2 font-medium">Frequency</th>
                <th className="py-1.5 pr-2 font-medium">Duration</th>
                <th className="py-1.5 font-medium">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m, i) => (
                <tr key={m.id} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-2 font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-2">
                    <p className="font-medium">{m.display || "Unnamed medication"}</p>
                    {m.route && (
                      <Badge variant="secondary" className="mt-1 text-[10px] font-normal">
                        {m.route}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {effective(m.editedDose, m.dose) ?? "—"}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {effective(m.editedFrequency, m.frequency) ?? "—"}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {effective(m.editedDuration, m.duration) ?? "—"}
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {m.patientInstruction || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Separator />

      {/* Footer — disclaimer + plain signature block (no QR / verification claim) */}
      <div className="flex items-end justify-between gap-4">
        <p className="max-w-xs text-[11px] text-muted-foreground">
          Generated from the electronic medical record. Verify all dosages before
          dispensing.
        </p>
        <div className="text-right">
          <p className="text-sm font-medium italic">{meta.doctorName}</p>
          {(prac?.qualifications || prac?.specialty) && (
            <p className="text-[11px] text-muted-foreground">
              {[prac?.qualifications, prac?.specialty].filter(Boolean).join(" · ")}
            </p>
          )}
          {prac?.regNo && (
            <p className="text-[11px] text-muted-foreground">Reg No: {prac.regNo}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Generated on {formatDisplayDateTime(new Date())}
          </p>
        </div>
      </div>
    </div>
  );
}

/** One cell in the patient-info bar — omitted entirely when its value is falsy. */
function InfoCell({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
