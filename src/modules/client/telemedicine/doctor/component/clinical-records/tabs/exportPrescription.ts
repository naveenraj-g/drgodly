/**
 * exportPrescription — download the prescription sheet as PDF, Word or plain text.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Mirrors ../note/exportNote.ts: a letterhead followed by a numbered list, laid
 * out by hand across the same three formats. Content and field order match
 * PrescriptionsTab.tsx's on-screen `RxPreview` exactly, so what downloads is
 * what was already previewed. Page geometry, pagination and the letterhead
 * subtitle come from ../exportDocument, shared with the note and lab-request
 * exports.
 */

import {
  createPdfCursor,
  downloadString,
  escapeHtml,
  PAGE,
  slug,
  type DocExportMeta,
} from "../exportDocument";
import type { MedicationFormItem } from "../../appointment-review/types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Formats the prescription sheet can be downloaded as. */
export type PrescriptionExportFormat = "pdf" | "word" | "text";

// ── Shared shaping ────────────────────────────────────────────────────────────

/**
 * Resolves a dosage field, preferring the doctor's edit over the AI original.
 *
 * @param edited - Doctor-edited value, if any.
 * @param original - Original value.
 * @returns The value to display, or null when neither is set.
 */
export function effective(
  edited: string | undefined,
  original: string | null | undefined,
): string | null {
  return edited ?? original ?? null;
}

/**
 * Builds the one-line "Sig" a pharmacist reads.
 *
 * @param item - The medication entry.
 * @returns Assembled sig, or a placeholder when nothing is recorded.
 */
export function buildSig(item: MedicationFormItem): string {
  const parts = [
    effective(item.editedDose, item.dose),
    effective(item.editedRoute, item.route),
    effective(item.editedFrequency, item.frequency),
    effective(item.editedDuration, item.duration),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No dosage recorded";
}

/** Assembles the qty/refills/substitution/indication meta line for one item. */
function metaLine(item: MedicationFormItem): string | null {
  const parts: string[] = [];
  if (item.dispenseQuantityValue) {
    parts.push(
      `Qty: ${item.dispenseQuantityValue}${item.dispenseQuantityUnit ? ` ${item.dispenseQuantityUnit}` : ""}`,
    );
  }
  if (item.dispenseRepeatsAllowed != null) {
    parts.push(`Refills: ${item.dispenseRepeatsAllowed}`);
  }
  if (item.substitutionAllowed === false) parts.push("Do not substitute");
  if (item.reasonCode) parts.push(`Indication: ${item.reasonCode}`);
  return parts.length ? parts.join("   ") : null;
}

const FOOTER =
  "Generated from the electronic medical record. Verify all dosages before dispensing.";

// ── Shared letterhead lines (plain-text form, reused by text + PDF) ──────────

/** Builds the clinic/doctor/patient-bar lines shared by the text and PDF exports. */
function letterheadLines(meta: DocExportMeta): string[] {
  const { organization: org, practitioner: prac, patientInfo } = meta;
  const out: string[] = [];

  out.push(org?.name ? org.name.toUpperCase() : "PRESCRIPTION");
  if (org?.addressLine) out.push(org.addressLine);
  const orgContact = [org?.phone, org?.email].filter(Boolean).join("  ·  ");
  if (orgContact) out.push(orgContact);
  if (org?.regNo) out.push(`Reg No: ${org.regNo}`);

  const prescriber = [meta.doctorName, prac?.qualifications, prac?.specialty]
    .filter(Boolean)
    .join(" · ");
  out.push(prescriber);
  if (prac?.regNo) out.push(`Reg No: ${prac.regNo}`);

  out.push("");
  if (meta.docRef) out.push(`Doc Ref: ${meta.docRef}`);
  if (meta.appointmentDate) out.push(`Date: ${meta.appointmentDate}`);

  out.push("");
  out.push(`Patient: ${meta.patientName}`);
  const ageGender = [
    patientInfo?.age != null ? `${patientInfo.age} Yrs` : null,
    patientInfo?.gender,
  ]
    .filter(Boolean)
    .join(" / ");
  if (ageGender) out.push(`Age / Gender: ${ageGender}`);
  if (patientInfo?.mobile) out.push(`Mobile: ${patientInfo.mobile}`);
  if (patientInfo?.patientId) out.push(`Patient ID: ${patientInfo.patientId}`);
  if (meta.diagnosis) out.push(`Provisional Diagnosis: ${meta.diagnosis}`);

  return out;
}

/** Builds the doctor's plain signature-block lines (no QR / verification claim). */
function signatureLines(meta: DocExportMeta): string[] {
  const { practitioner: prac } = meta;
  const out: string[] = [meta.doctorName];
  const credentials = [prac?.qualifications, prac?.specialty].filter(Boolean).join(" · ");
  if (credentials) out.push(credentials);
  if (prac?.regNo) out.push(`Reg No: ${prac.regNo}`);
  out.push(`Generated on ${new Date().toLocaleString()}`);
  return out;
}

// ── Text ──────────────────────────────────────────────────────────────────────

/**
 * Renders the prescription sheet as plain text.
 *
 * @param medications - Medications to list.
 * @param meta - Letterhead details.
 * @returns The full document as a string.
 */
export function prescriptionToPlainText(
  medications: MedicationFormItem[],
  meta: DocExportMeta,
): string {
  const out: string[] = [...letterheadLines(meta), "", `PRESCRIBED MEDICATIONS (${medications.length})`, ""];

  medications.forEach((m, i) => {
    out.push(`${i + 1}. ${m.display || "Unnamed medication"}`);
    out.push(`   ${buildSig(m)}`);
    if (m.patientInstruction) out.push(`   ${m.patientInstruction}`);
    const meta2 = metaLine(m);
    if (meta2) out.push(`   ${meta2}`);
    out.push("");
  });

  out.push(FOOTER);
  out.push("");
  out.push(...signatureLines(meta));
  return out.join("\n");
}

// ── Word ──────────────────────────────────────────────────────────────────────

/**
 * Renders the prescription sheet as a Word-compatible HTML document.
 *
 * @param medications - Medications to list.
 * @param meta - Letterhead details.
 * @returns Complete HTML document string.
 */
export function prescriptionToWordHtml(
  medications: MedicationFormItem[],
  meta: DocExportMeta,
): string {
  const { organization: org, practitioner: prac, patientInfo } = meta;

  const rows = medications
    .map(
      (m, i) => `<tr>
        <td style="padding:4pt;border:1pt solid #ccc;">${i + 1}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(m.display || "Unnamed medication")}${m.route ? ` <i>(${escapeHtml(m.route)})</i>` : ""}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(effective(m.editedDose, m.dose) ?? "—")}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(effective(m.editedFrequency, m.frequency) ?? "—")}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(effective(m.editedDuration, m.duration) ?? "—")}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(m.patientInstruction || "—")}</td>
      </tr>`,
    )
    .join("");

  const patientBarRow = (label: string, value: string | null) =>
    value ? `<p style="margin:1pt 0;"><b>${label}:</b> ${escapeHtml(value)}</p>` : "";

  const ageGender = [
    patientInfo?.age != null ? `${patientInfo.age} Yrs` : null,
    patientInfo?.gender,
  ]
    .filter(Boolean)
    .join(" / ");

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Prescription</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;">
  <table style="width:100%;border:0;"><tr>
    <td style="vertical-align:top;">
      <h1 style="margin:0;font-size:16pt;">${escapeHtml(org?.name ?? "Prescription")}</h1>
      ${org?.addressLine ? `<p style="margin:2pt 0;color:#666;font-size:9pt;">${escapeHtml(org.addressLine)}</p>` : ""}
      <p style="margin:0;color:#666;font-size:9pt;">${escapeHtml([org?.phone, org?.email].filter(Boolean).join("  ·  "))}</p>
      ${org?.regNo ? `<p style="margin:0;color:#666;font-size:9pt;">Reg No: ${escapeHtml(org.regNo)}</p>` : ""}
    </td>
    <td style="vertical-align:top;text-align:right;">
      <p style="margin:0;font-weight:bold;">${escapeHtml(meta.doctorName)}</p>
      ${prac?.qualifications ? `<p style="margin:0;color:#666;font-size:9pt;">${escapeHtml(prac.qualifications)}</p>` : ""}
      ${prac?.specialty ? `<p style="margin:0;color:#666;font-size:9pt;">${escapeHtml(prac.specialty)}</p>` : ""}
      ${prac?.regNo ? `<p style="margin:0;color:#666;font-size:9pt;">Reg No: ${escapeHtml(prac.regNo)}</p>` : ""}
    </td>
  </tr></table>
  <p style="margin:8pt 0 2pt;font-size:9pt;color:#666;">${meta.docRef ? `Doc Ref: ${escapeHtml(meta.docRef)} &nbsp;·&nbsp; ` : ""}${meta.appointmentDate ? `Date: ${escapeHtml(meta.appointmentDate)}` : ""}</p>
  <div style="margin:6pt 0;padding:6pt;background:#f7f7f7;">
    ${patientBarRow("Patient", meta.patientName)}
    ${patientBarRow("Age / Gender", ageGender || null)}
    ${patientBarRow("Mobile", patientInfo?.mobile ?? null)}
    ${patientBarRow("Patient ID", patientInfo?.patientId ?? null)}
    ${patientBarRow("Provisional Diagnosis", meta.diagnosis ?? null)}
  </div>
  <p style="margin:8pt 0 4pt;font-weight:bold;">Prescribed Medications (${medications.length})</p>
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    <tr style="background:#eee;">
      <th style="padding:4pt;border:1pt solid #ccc;">#</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Medicine</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Dose</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Frequency</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Duration</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Instructions</th>
    </tr>
    ${rows}
  </table>
  <p style="margin:12pt 0 0;font-size:9pt;color:#888;">${escapeHtml(FOOTER)}</p>
  <div style="margin-top:18pt;text-align:right;">
    <p style="margin:0;font-style:italic;">${escapeHtml(meta.doctorName)}</p>
    ${[prac?.qualifications, prac?.specialty].filter(Boolean).length ? `<p style="margin:0;font-size:9pt;color:#666;">${escapeHtml([prac?.qualifications, prac?.specialty].filter(Boolean).join(" · "))}</p>` : ""}
    ${prac?.regNo ? `<p style="margin:0;font-size:9pt;color:#666;">Reg No: ${escapeHtml(prac.regNo)}</p>` : ""}
    <p style="margin:0;font-size:8pt;color:#999;">Generated on ${escapeHtml(new Date().toLocaleString())}</p>
  </div>
</body>
</html>`;
}

// ── PDF ───────────────────────────────────────────────────────────────────────

/**
 * Builds the prescription sheet as a jsPDF document.
 *
 * @param medications - Medications to list.
 * @param meta - Letterhead details.
 * @returns The rendered jsPDF document.
 */
export async function buildPrescriptionPdf(
  medications: MedicationFormItem[],
  meta: DocExportMeta,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cursor = createPdfCursor(doc);

  // ── Letterhead ──
  const { organization: org, practitioner: prac } = meta;
  cursor.write(org?.name ?? "Prescription", 16, "bold");
  if (org?.addressLine) {
    doc.setTextColor(110);
    cursor.write(org.addressLine, 9, "normal");
  }
  const orgContact = [org?.phone, org?.email].filter(Boolean).join("  ·  ");
  if (orgContact) cursor.write(orgContact, 9, "normal");
  if (org?.regNo) cursor.write(`Reg No: ${org.regNo}`, 9, "normal");
  doc.setTextColor(17);

  cursor.y += 1;
  const prescriber = [meta.doctorName, prac?.qualifications, prac?.specialty]
    .filter(Boolean)
    .join(" · ");
  doc.setTextColor(80);
  cursor.write(prescriber, 10, "bold");
  doc.setTextColor(17);
  if (prac?.regNo) {
    doc.setTextColor(110);
    cursor.write(`Reg No: ${prac.regNo}`, 9, "normal");
    doc.setTextColor(17);
  }

  cursor.y += 2;
  doc.setDrawColor(200);
  doc.line(PAGE.margin, cursor.y, PAGE.width - PAGE.margin, cursor.y);
  cursor.y += 4;

  doc.setTextColor(110);
  const refDate = [
    meta.docRef ? `Doc Ref: ${meta.docRef}` : null,
    meta.appointmentDate ? `Date: ${meta.appointmentDate}` : null,
  ]
    .filter(Boolean)
    .join("   ");
  if (refDate) cursor.write(refDate, 9, "normal");
  doc.setTextColor(17);

  cursor.y += 2;
  const { patientInfo } = meta;
  cursor.write(`Patient: ${meta.patientName}`, 10, "bold");
  doc.setTextColor(110);
  const ageGender = [
    patientInfo?.age != null ? `${patientInfo.age} Yrs` : null,
    patientInfo?.gender,
  ]
    .filter(Boolean)
    .join(" / ");
  const patientLine = [
    ageGender,
    patientInfo?.mobile,
    patientInfo?.patientId ? `ID: ${patientInfo.patientId}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
  if (patientLine) cursor.write(patientLine, 9, "normal");
  doc.setTextColor(17);
  if (meta.diagnosis) {
    cursor.write(`Provisional Diagnosis: ${meta.diagnosis}`, 9, "normal");
  }
  cursor.y += 2;

  // ── Medications table ──
  cursor.write(`Prescribed Medications (${medications.length})`, 10, "bold");
  cursor.y += 1;
  autoTable(doc, {
    startY: cursor.y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [["#", "Medicine", "Dose", "Frequency", "Duration", "Instructions"]],
    body: medications.map((m, i) => [
      String(i + 1),
      m.display || "Unnamed medication",
      effective(m.editedDose, m.dose) ?? "—",
      effective(m.editedFrequency, m.frequency) ?? "—",
      effective(m.editedDuration, m.duration) ?? "—",
      m.patientInstruction || "—",
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });
  cursor.y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── Footer ──
  doc.setDrawColor(200);
  doc.line(PAGE.margin, cursor.y, PAGE.width - PAGE.margin, cursor.y);
  cursor.y += 4;
  doc.setTextColor(150);
  cursor.write(FOOTER, 8, "normal");
  doc.setTextColor(17);

  cursor.y += 2;
  const sigX = PAGE.width - PAGE.margin;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(meta.doctorName, sigX, cursor.y, { align: "right" });
  cursor.y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  const credentials = [prac?.qualifications, prac?.specialty].filter(Boolean).join(" · ");
  if (credentials) {
    doc.text(credentials, sigX, cursor.y, { align: "right" });
    cursor.y += 4;
  }
  if (prac?.regNo) {
    doc.text(`Reg No: ${prac.regNo}`, sigX, cursor.y, { align: "right" });
    cursor.y += 4;
  }
  doc.setTextColor(150);
  doc.text(`Generated on ${new Date().toLocaleString()}`, sigX, cursor.y, {
    align: "right",
  });
  doc.setTextColor(17);

  return doc;
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Downloads the prescription sheet in the requested format.
 *
 * @param format - "pdf", "word" or "text".
 * @param medications - Medications to export.
 * @param meta - Letterhead details.
 * @throws Whatever jsPDF throws if the PDF renderer fails to load; callers
 *         surface it as a toast.
 */
export async function downloadPrescription(
  format: PrescriptionExportFormat,
  medications: MedicationFormItem[],
  meta: DocExportMeta,
): Promise<void> {
  const stem = slug("prescription", meta.patientName);

  switch (format) {
    case "pdf": {
      const doc = await buildPrescriptionPdf(medications, meta);
      doc.save(`${stem}.pdf`);
      return;
    }
    case "word":
      downloadString(
        prescriptionToWordHtml(medications, meta),
        `${stem}.doc`,
        "application/msword",
      );
      return;
    case "text":
      downloadString(
        prescriptionToPlainText(medications, meta),
        `${stem}.txt`,
        "text/plain;charset=utf-8",
      );
      return;
  }
}
