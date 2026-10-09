/**
 * doctor_create_document_reference_schema — Zod transform for Step 5 of
 * doctor_upload_patient_report.
 *
 * Layer: client / ai-hub / schemas / validation / results
 *
 * This step's form has no interactive fields — every value it needs already
 * survived into sessionContext from earlier steps, since /api/workflow/submit
 * merges a step's full cleaned form data forward (not just its declared
 * context.outputs). Field sources:
 *   patient_id           — sessionContext (Step 2 output)
 *   encounter_id          — sessionContext (Step 3 output)
 *   org_id                — sessionContext (always present, session-derived)
 *   service_request_id    — sessionContext (Step 4's own form data, carried
 *                            forward — not a declared output, but present)
 *   diagnostic_report_id   — sessionContext (Step 4's declared output)
 *   report_file            — sessionContext (Step 4's FileUpload value,
 *                            carried forward): { fileId, filename, contentType, sizeBytes }
 *
 * Output (POST /document-references/) — mirrors what
 * UploadOrderResultModal.tsx's DocumentReference create already does for the
 * same upload, so a report filed via this workflow reads identically in the
 * Documents tab to one filed via the doctor dashboard's upload dialog.
 */

import { z } from "zod";

/** Coerces any string/number representation to a positive integer; returns -1 on failure. */
const toPositiveInt = (v: unknown): number => {
  if (v === undefined || v === null) return -1;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return -1;
  const n = Number(s);
  return isNaN(n) ? -1 : Math.floor(n);
};

export const doctorCreateDocumentReferenceSchema = z
  .object({
    patient_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Patient context lost. Please restart the workflow."),
    ),
    encounter_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Encounter context lost. Please restart the workflow."),
    ),
    org_id: z.string().min(1, "Organization context lost. Please restart the workflow."),
    service_request_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Test order context lost. Please restart the workflow."),
    ),
    diagnostic_report_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Diagnostic report context lost. Please restart the workflow."),
    ),
    report_file: z.object({
      fileId: z.string().min(1),
      filename: z.string(),
      contentType: z.string(),
      sizeBytes: z.number(),
    }),
  })
  .transform((d) => ({
    org_id: d.org_id,
    status: "current",
    /** FHIR reference to the patient. */
    subject: `Patient/${d.patient_id}`,
    description: d.report_file.filename,
    content: [
      {
        attachment: {
          url: d.report_file.fileId,
          content_type: d.report_file.contentType,
          title: d.report_file.filename,
          size: d.report_file.sizeBytes,
          creation: new Date().toISOString(),
        },
      },
    ],
    context: {
      encounter: [{ reference: `Encounter/${d.encounter_id}` }],
      related: [
        { reference: `DiagnosticReport/${d.diagnostic_report_id}` },
        { reference: `ServiceRequest/${d.service_request_id}` },
      ],
    },
  }));
