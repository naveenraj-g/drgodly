/**
 * exportDocument — shared building blocks for downloadable clinical documents.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * The consultation note, the prescription sheet and the lab-request sheet are
 * all the same shape of artefact: a letterhead followed by a flowing list, laid
 * out by hand across three formats (PDF, Word-compatible HTML, plain text)
 * rather than through a table-grid helper — none of them are tabular data. This
 * module holds the pieces that are identical across all three documents so each
 * export file only has to describe its own content, not re-implement page
 * geometry, pagination or the letterhead subtitle line.
 */

import type jsPDF from "jspdf";
import type { TOrgResponse } from "@/modules/entities/schemas/organization";
import type { TPractitionerQualificationResponse } from "@/modules/entities/schemas/practitioner";
import type { TPractitionerRoleResponse } from "@/modules/entities/schemas/practitioner-role";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Clinic letterhead fields — the left side of the sheet header. */
export interface OrgLetterhead {
  name: string;
  /** Single formatted line — street, city, state, postal code. */
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  /** First identifier on file, if any. Not a guaranteed registration scheme. */
  regNo: string | null;
}

/** Prescriber credentials — the right side of the sheet header. */
export interface PractitionerLetterhead {
  /** Qualification names joined, e.g. "MBBS, MD". */
  qualifications: string | null;
  /** Specialty/department names joined, e.g. "Internal Medicine & Diabetology". */
  specialty: string | null;
  /** First qualification identifier on file, if any. */
  regNo: string | null;
}

/** Patient identity fields for the sheet's patient-info bar. */
export interface PatientLetterhead {
  age: number | null;
  /** Capitalised, e.g. "Male". Null when not on file. */
  gender: string | null;
  mobile: string | null;
  /** First identifier on file. Labelled "Patient ID" — not a guaranteed UHID/MRN scheme. */
  patientId: string | null;
}

/** Letterhead details shared by every exportable clinical document. */
export interface DocExportMeta {
  /** Patient display name. */
  patientName: string;
  /** Authoring doctor's display name. */
  doctorName: string;
  /** Formatted visit date, or null when unknown. */
  appointmentDate: string | null;
  /** Clinic details. Null when the tenant has no Organization record on file. */
  organization?: OrgLetterhead | null;
  /** Prescriber credentials. Null when no qualifications/roles are on file. */
  practitioner?: PractitionerLetterhead | null;
  /** Patient demographic details. Null when the Patient record is unavailable. */
  patientInfo?: PatientLetterhead | null;
  /** Provisional diagnosis — joined display names of confirmed Conditions. */
  diagnosis?: string | null;
  /** Traceable document reference, e.g. "RX-1042". Not a fabricated identifier. */
  docRef?: string | null;
}

// ── Shared formatting ─────────────────────────────────────────────────────────

/** Builds the letterhead sub-title, e.g. "Jane Doe · 12 Aug 2026 · Dr Smith". */
export function subtitle(meta: DocExportMeta): string {
  return [meta.patientName, meta.appointmentDate, meta.doctorName]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Builds the clinic letterhead from the tenant's Organization record.
 *
 * @param org - Organization record from getMyOrganizationAction, or null.
 * @returns Letterhead fields, or null when there is no organization or name.
 */
export function buildOrgLetterhead(
  org: TOrgResponse | null | undefined,
): OrgLetterhead | null {
  if (!org?.name) return null;
  const addr = org.address?.[0];
  const addressLine = addr
    ? [...(addr.line ?? []), addr.city, addr.state, addr.postal_code]
        .filter(Boolean)
        .join(", ") || null
    : null;
  const phone = org.telecom?.find((t) => t.system === "phone")?.value ?? null;
  const email = org.telecom?.find((t) => t.system === "email")?.value ?? null;
  const regNo = org.identifier?.[0]?.value ?? null;
  return { name: org.name, addressLine, phone, email, regNo };
}

/**
 * Builds the prescriber credentials from qualification and role records.
 *
 * @param qualifications - Qualifications on file for the practitioner.
 * @param roles - PractitionerRoles on file for the practitioner (carries specialty).
 * @returns Letterhead fields, or null when nothing is on file for either.
 */
export function buildPractitionerLetterhead(
  qualifications: TPractitionerQualificationResponse[],
  roles: TPractitionerRoleResponse[],
): PractitionerLetterhead | null {
  const qualNames = qualifications
    .map((q) => q.code_display ?? q.code_text)
    .filter((v): v is string => Boolean(v));
  const specialtyNames = roles
    .flatMap((r) => r.specialty ?? [])
    .map((s) => s.coding_display ?? s.text)
    .filter((v): v is string => Boolean(v));
  const regNo =
    qualifications.flatMap((q) => q.identifier ?? []).find((i) => i.value)
      ?.value ?? null;

  if (!qualNames.length && !specialtyNames.length && !regNo) return null;
  return {
    qualifications: qualNames.length ? qualNames.join(", ") : null,
    specialty: specialtyNames.length ? specialtyNames.join(" & ") : null,
    regNo,
  };
}

/**
 * Builds the patient-info bar fields from the Patient record.
 *
 * @param patient - Patient record, or null/undefined when unavailable.
 * @returns Letterhead fields, or null when the patient record itself is absent.
 */
export function buildPatientLetterhead(
  patient: TPatientResponse | null | undefined,
): PatientLetterhead | null {
  if (!patient) return null;
  const age = patient.birth_date ? ageFromBirthDate(patient.birth_date) : null;
  const gender = patient.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
    : null;
  const mobile = patient.telecom?.find((t) => t.system === "phone")?.value ?? null;
  const patientId = patient.identifier?.[0]?.value ?? null;
  return { age, gender, mobile, patientId };
}

/** Computes age in whole years from an ISO birth date string. */
function ageFromBirthDate(birthDate: string): number | null {
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Builds the provisional-diagnosis line from confirmed Conditions.
 *
 * @param conditions - Condition-like records with a display/text code name.
 * @returns Joined display names, or null when there are none.
 */
export function buildDiagnosis(
  conditions: { code_display?: string | null; code_text?: string | null }[],
): string | null {
  const names = conditions
    .map((c) => c.code_display ?? c.code_text)
    .filter((v): v is string => Boolean(v));
  return names.length ? names.join(", ") : null;
}

/** Escapes text for safe inclusion in a generated HTML document. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Builds a filesystem-safe filename stem, e.g. "prescription-jane-doe".
 *
 * @param prefix - Document type, e.g. "consultation-note" or "prescription".
 * @param patientName - Patient the document is for.
 * @returns Filename without an extension.
 */
export function slug(prefix: string, patientName: string): string {
  const s = patientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s ? `${prefix}-${s}` : prefix;
}

/**
 * Triggers a browser download for a generated string.
 *
 * @param content - File body.
 * @param filename - Full filename including extension.
 * @param mimeType - MIME type for the Blob.
 */
export function downloadString(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  /* Deferred so the download has started before the URL is released. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── PDF geometry ──────────────────────────────────────────────────────────────

/** Page geometry, in the jsPDF default unit (mm) for A4 portrait. */
export const PAGE = { width: 210, height: 297, margin: 18 } as const;
export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

/** Writes wrapped, paginated text onto a jsPDF document, tracking its own cursor. */
export interface PdfCursor {
  /** Current vertical position, in mm from the page top. Mutable — callers may
   *  advance it directly (blank space, a horizontal rule) between writes. */
  y: number;
  /** Starts a new page if the next `needed` mm would overflow the bottom margin. */
  ensureSpace(needed: number): void;
  /** Writes wrapped text at the cursor and advances it, paginating as needed. */
  write(
    text: string,
    size: number,
    style: "normal" | "bold",
    indent?: number,
  ): void;
}

/**
 * Creates a pagination cursor bound to a jsPDF document.
 *
 * @param doc - The document to write onto.
 * @returns A cursor starting at the top margin of the first page.
 */
export function createPdfCursor(doc: jsPDF): PdfCursor {
  const cursor: PdfCursor = {
    y: PAGE.margin,
    ensureSpace(needed) {
      if (cursor.y + needed <= PAGE.height - PAGE.margin) return;
      doc.addPage();
      cursor.y = PAGE.margin;
    },
    write(text, size, style, indent = 0) {
      doc.setFontSize(size);
      doc.setFont("helvetica", style);
      const lineHeight = size * 0.42;
      for (const l of doc.splitTextToSize(text, CONTENT_WIDTH - indent) as string[]) {
        cursor.ensureSpace(lineHeight);
        doc.text(l, PAGE.margin + indent, cursor.y);
        cursor.y += lineHeight;
      }
    },
  };
  return cursor;
}
