/**
 * exportLabOrders — download the lab/investigation request sheet as PDF, Word
 * or plain text.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Mirrors ./exportPrescription.ts: a letterhead followed by a numbered list of
 * orders, laid out by hand across the same three formats. Content and field
 * order match OrdersTab.tsx's on-screen `LabOrderPreview` exactly, so what
 * downloads is what was already previewed. Page geometry, pagination and the
 * letterhead subtitle come from ../exportDocument, shared with the note and
 * prescription exports.
 */

import {
  createPdfCursor,
  downloadString,
  escapeHtml,
  PAGE,
  slug,
  type DocExportMeta,
} from "../exportDocument";
import type { ServiceRequestFormItem } from "../../appointment-review/types";
import { formatDisplayDate, formatDisplayDateTime, formatDisplayTime } from "@/modules/shared/helper";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Formats the lab-request sheet can be downloaded as. */
export type LabOrderExportFormat = "pdf" | "word" | "text";

// ── Shared shaping ────────────────────────────────────────────────────────────

/** Turns a code like "entered-in-error" into "Entered in error" for display. */
export function humanise(code: string | undefined): string | null {
  if (!code) return null;
  const spaced = code.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Formats an ISO datetime for the "Perform on" line, or null when unset. */
function performOn(item: ServiceRequestFormItem): string | null {
  if (!item.occurrenceDatetime) return null;
  try {
    return `${formatDisplayDate(item.occurrenceDatetime)}, ${formatDisplayTime(item.occurrenceDatetime)}`;
  } catch {
    return null;
  }
}

/** Builds the status/priority/category classification line for one order. */
export function classificationLine(item: ServiceRequestFormItem): string {
  const parts = [humanise(item.status), humanise(item.priority), item.category].filter(
    Boolean,
  );
  return parts.length ? parts.join(" · ") : "No classification recorded";
}

/** Builds the perform-on/PRN scheduling line, or null when nothing is set. */
export function schedulingLine(item: ServiceRequestFormItem): string | null {
  const on = performOn(item);
  const parts = [on ? `Perform on: ${on}` : null, item.asNeeded ? "As needed (PRN)" : null].filter(
    Boolean,
  );
  return parts.length ? parts.join("   ") : null;
}

const FOOTER =
  "Generated from the electronic medical record. Confirm test requirements with the receiving lab.";

// ── Shared letterhead lines (plain-text form, reused by text + PDF) ──────────

/** Builds the clinic/doctor/patient-bar lines shared by the text and PDF exports. */
function letterheadLines(meta: DocExportMeta): string[] {
  const { organization: org, practitioner: prac, patientInfo } = meta;
  const out: string[] = [];

  out.push(org?.name ? org.name.toUpperCase() : "LAB / INVESTIGATION REQUEST");
  if (org?.addressLine) out.push(org.addressLine);
  const orgContact = [org?.phone, org?.email].filter(Boolean).join("  ·  ");
  if (orgContact) out.push(orgContact);
  if (org?.regNo) out.push(`Reg No: ${org.regNo}`);

  const orderingPhysician = [meta.doctorName, prac?.qualifications, prac?.specialty]
    .filter(Boolean)
    .join(" · ");
  out.push(orderingPhysician);
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
  out.push(`Generated on ${formatDisplayDateTime(new Date())}`);
  return out;
}

// ── Text ──────────────────────────────────────────────────────────────────────

/**
 * Renders the lab-request sheet as plain text.
 *
 * @param orders - Orders to list.
 * @param meta - Letterhead details.
 * @returns The full document as a string.
 */
export function labOrderToPlainText(
  orders: ServiceRequestFormItem[],
  meta: DocExportMeta,
): string {
  const out: string[] = [...letterheadLines(meta), "", `ORDERS / INVESTIGATIONS (${orders.length})`, ""];

  orders.forEach((o, i) => {
    out.push(`${i + 1}. ${o.display || "Unnamed order"}`);
    out.push(`   ${classificationLine(o)}`);
    const schedule = schedulingLine(o);
    if (schedule) out.push(`   ${schedule}`);
    if (o.patientInstruction) out.push(`   ${o.patientInstruction}`);
    if (o.reasonCode) out.push(`   Indication: ${o.reasonCode}`);
    if (o.note) out.push(`   Note: ${o.note}`);
    out.push("");
  });

  out.push(FOOTER);
  out.push("");
  out.push(...signatureLines(meta));
  return out.join("\n");
}

// ── Word ──────────────────────────────────────────────────────────────────────

/**
 * Renders the lab-request sheet as a Word-compatible HTML document.
 *
 * @param orders - Orders to list.
 * @param meta - Letterhead details.
 * @returns Complete HTML document string.
 */
export function labOrderToWordHtml(
  orders: ServiceRequestFormItem[],
  meta: DocExportMeta,
): string {
  const { organization: org, practitioner: prac, patientInfo } = meta;

  const rows = orders
    .map((o, i) => {
      const schedule = schedulingLine(o);
      return `<tr>
        <td style="padding:4pt;border:1pt solid #ccc;">${i + 1}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(o.display || "Unnamed order")}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(classificationLine(o))}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(schedule ?? "—")}</td>
        <td style="padding:4pt;border:1pt solid #ccc;">${escapeHtml(o.patientInstruction || o.note || "—")}</td>
      </tr>`;
    })
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
<head><meta charset="utf-8"><title>Lab Request</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;">
  <table style="width:100%;border:0;"><tr>
    <td style="vertical-align:top;">
      <h1 style="margin:0;font-size:16pt;">${escapeHtml(org?.name ?? "Lab / Investigation Request")}</h1>
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
  <p style="margin:8pt 0 4pt;font-weight:bold;">Orders / Investigations (${orders.length})</p>
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    <tr style="background:#eee;">
      <th style="padding:4pt;border:1pt solid #ccc;">#</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Test / Investigation</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Classification</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Scheduling</th>
      <th style="padding:4pt;border:1pt solid #ccc;">Instructions</th>
    </tr>
    ${rows}
  </table>
  <p style="margin:12pt 0 0;font-size:9pt;color:#888;">${escapeHtml(FOOTER)}</p>
  <div style="margin-top:18pt;text-align:right;">
    <p style="margin:0;font-style:italic;">${escapeHtml(meta.doctorName)}</p>
    ${[prac?.qualifications, prac?.specialty].filter(Boolean).length ? `<p style="margin:0;font-size:9pt;color:#666;">${escapeHtml([prac?.qualifications, prac?.specialty].filter(Boolean).join(" · "))}</p>` : ""}
    ${prac?.regNo ? `<p style="margin:0;font-size:9pt;color:#666;">Reg No: ${escapeHtml(prac.regNo)}</p>` : ""}
    <p style="margin:0;font-size:8pt;color:#999;">Generated on ${escapeHtml(formatDisplayDateTime(new Date()))}</p>
  </div>
</body>
</html>`;
}

// ── PDF ───────────────────────────────────────────────────────────────────────

/**
 * Builds the lab-request sheet as a jsPDF document.
 *
 * @param orders - Orders to list.
 * @param meta - Letterhead details.
 * @returns The rendered jsPDF document.
 */
export async function buildLabOrderPdf(
  orders: ServiceRequestFormItem[],
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
  cursor.write(org?.name ?? "Lab / Investigation Request", 16, "bold");
  if (org?.addressLine) {
    doc.setTextColor(110);
    cursor.write(org.addressLine, 9, "normal");
  }
  const orgContact = [org?.phone, org?.email].filter(Boolean).join("  ·  ");
  if (orgContact) cursor.write(orgContact, 9, "normal");
  if (org?.regNo) cursor.write(`Reg No: ${org.regNo}`, 9, "normal");
  doc.setTextColor(17);

  cursor.y += 1;
  const orderingPhysician = [meta.doctorName, prac?.qualifications, prac?.specialty]
    .filter(Boolean)
    .join(" · ");
  doc.setTextColor(80);
  cursor.write(orderingPhysician, 10, "bold");
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

  // ── Orders table ──
  cursor.write(`Orders / Investigations (${orders.length})`, 10, "bold");
  cursor.y += 1;
  autoTable(doc, {
    startY: cursor.y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [["#", "Test / Investigation", "Classification", "Scheduling", "Instructions"]],
    body: orders.map((o, i) => [
      String(i + 1),
      o.display || "Unnamed order",
      classificationLine(o),
      schedulingLine(o) ?? "—",
      o.patientInstruction || o.note || "—",
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
  doc.text(`Generated on ${formatDisplayDateTime(new Date())}`, sigX, cursor.y, {
    align: "right",
  });
  doc.setTextColor(17);

  return doc;
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Downloads the lab-request sheet in the requested format.
 *
 * @param format - "pdf", "word" or "text".
 * @param orders - Orders to export.
 * @param meta - Letterhead details.
 * @throws Whatever jsPDF throws if the PDF renderer fails to load; callers
 *         surface it as a toast.
 */
export async function downloadLabOrder(
  format: LabOrderExportFormat,
  orders: ServiceRequestFormItem[],
  meta: DocExportMeta,
): Promise<void> {
  const stem = slug("lab-request", meta.patientName);

  switch (format) {
    case "pdf": {
      const doc = await buildLabOrderPdf(orders, meta);
      doc.save(`${stem}.pdf`);
      return;
    }
    case "word":
      downloadString(
        labOrderToWordHtml(orders, meta),
        `${stem}.doc`,
        "application/msword",
      );
      return;
    case "text":
      downloadString(
        labOrderToPlainText(orders, meta),
        `${stem}.txt`,
        "text/plain;charset=utf-8",
      );
      return;
  }
}
