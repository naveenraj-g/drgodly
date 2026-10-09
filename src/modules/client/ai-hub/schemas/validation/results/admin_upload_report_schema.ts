/**
 * admin_upload_report_schema — Zod transform for Step 3 of upload_patient_report.
 *
 * Layer: client / ai-hub / schemas / validation / results
 *
 * Validates the form data from Step 3 of the upload_patient_report workflow and
 * transforms it into the payload expected by POST /diagnostic-reports/.
 *
 * Form field sources — every catalog component (DataSelect, DynamicSelect,
 * FileUpload) writes its hidden input's `id` as the bare emit key / component
 * id, with no componentId prefix (see form.tsx's collectFormData and each
 * component's own emits block) — the field names below must match that
 * exactly, or the submission silently fails Zod validation:
 *   patient_id       — from sessionContext (Step 1 output)
 *   encounter_id      — from sessionContext (Step 2 output)
 *   service_request_id — DataSelect emit key (component id="service_request_select",
 *                         emits: [{ key: "service_request_id", ... }])
 *   report_file        — FileUpload component (id="report_file")
 *                         writes { fileId, filename, contentType, sizeBytes }
 *
 * Output (POST /diagnostic-reports/):
 *   {
 *     status: "final",
 *     subject: "Patient/{patient_id}",
 *     encounter_id,
 *     org_id,
 *     based_on: [{ reference: "ServiceRequest/{id}" }],
 *     presented_form: [{ url, content_type, size, title, creation }]
 *   }
 *
 * org_id is always present in sessionContext (server-derived from the
 * authenticated session on every /api/workflow request — see
 * buildBaseContext in _lib.ts), not a form field, so it's read straight
 * through rather than validated against a form emit.
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

/**
 * Validates and transforms Step 3 of upload_patient_report into a
 * POST /diagnostic-reports/ payload.
 */
export const adminUploadReportSchema = z
  .object({
    /** Carried from sessionContext — set by Step 1's GET /patients/$patient_id output. */
    patient_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Patient context lost. Please restart the workflow."),
    ),

    /** Carried from sessionContext — set by Step 2's GET /encounters/ output. */
    encounter_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Encounter context lost. Please restart the workflow."),
    ),

    /** Carried from sessionContext — always present, stamped from the session. */
    org_id: z.string().min(1, "Organization context lost. Please restart the workflow."),

    /**
     * DataSelect emit: component id="service_request_select", emit key="service_request_id".
     * The hidden input's id is the bare emit key — no componentId prefix.
     */
    service_request_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Please select a test order before uploading."),
    ),

    /**
     * FileUpload component (id="report_file") writes a JSON object after a
     * successful FileNest upload: { fileId, filename, contentType, sizeBytes }.
     */
    report_file: z.object({
      /** FileNest file ID stored as DiagnosticReport.presentedForm[].url. */
      fileId: z.string().min(1, "Please upload a report file before submitting."),
      /** Original filename — stored as presentedForm[].title. */
      filename: z.string(),
      /** MIME type — stored as presentedForm[].content_type. */
      contentType: z.string(),
      /** File size in bytes — stored as presentedForm[].size. */
      sizeBytes: z.number(),
    }),
  })
  .transform((d) => ({
    /** FHIR R4 DiagnosticReport.status — final since the file is already produced. */
    status: "final",
    /** FHIR reference to the patient. */
    subject: `Patient/${d.patient_id}`,
    /** Links the report to the encounter it belongs to. */
    encounter_id: d.encounter_id,
    /** Tenant scoping — every FHIR_GQL_URL-backed create call stamps this. */
    org_id: d.org_id,
    /**
     * Fulfils the ServiceRequest that ordered this test.
     * FHIR DiagnosticReport.basedOn[].reference.
     */
    based_on: [
      { reference: `ServiceRequest/${d.service_request_id}` },
    ],
    /**
     * The uploaded file. FileNest fileId is stored as the URL and resolved to
     * a presigned download URL on read by the fhir-server.
     */
    presented_form: [
      {
        url: d.report_file.fileId,
        content_type: d.report_file.contentType,
        size: d.report_file.sizeBytes,
        title: d.report_file.filename,
        creation: new Date().toISOString(),
      },
    ],
  }));
