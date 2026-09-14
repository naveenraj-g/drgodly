/**
 * /docs/mobile-guide/fhir-staging — the StagingMedicalRecord reference page.
 *
 * Layer: app / docs / mobile-guide
 *
 * A dedicated page rather than one more entry in the FHIR resource family:
 * this is a proprietary "AI-extraction holding area" resource, not core
 * FHIR, and it breaks the "always Bearer JWT" rule every other resource
 * follows — important enough to call out on its own page rather than bury
 * inside the generic [resource] template.
 */

import Link from "next/link";
import { EndpointCard } from "@/modules/client/docs/components/EndpointCard";
import type { EndpointDoc } from "@/modules/client/docs/types";

const BASE_URL = "{FHIR_STAGING_SERVER_URL}";

const ENDPOINTS: EndpointDoc[] = [
  {
    method: "POST",
    path: "",
    summary: "Create a staging record",
    notes:
      "Written by the document-extraction AI agent right after it processes an uploaded file — not usually something a mobile " +
      "client creates directly, but documented for completeness.",
    requestExample: {
      file_id: "fn_abc123",
      patient_id: 10001,
      appointment_id: 40019,
      service_request_id: 80007,
      status: "pending",
      observations: [{ code_display: "Total Cholesterol", value_quantity_value: 210, value_quantity_unit: "mg/dL", effective_date_time: "2026-01-15T09:00:00Z" }],
    },
    responseExample: { id: 5001, status: "pending", file_id: "fn_abc123", patient_id: 10001, review_status: null, observations: [{ id: 1, code_display: "Total Cholesterol", value_quantity_value: 210 }] },
  },
  {
    method: "GET",
    path: "",
    summary: "List staging records",
    queryParams: [
      { name: "status", type: "string", description: "pending | processing | completed | failed" },
      { name: "file_id", type: "string", description: "Exact match on the FileNest file id" },
      { name: "patient_id", type: "number", description: "Filter to one patient" },
      { name: "appointment_id", type: "number", description: "Filter to one appointment" },
      { name: "encounter_id", type: "number", description: "Filter to one encounter" },
      { name: "service_request_id", type: "number", description: "Filter to the order this record was produced against" },
      { name: "diagnostic_report_id", type: "number", description: "Filter to one diagnostic report" },
      { name: "org_id", type: "string", description: "Filter to one organization" },
      { name: "user_id", type: "string", description: "Filter to one Better Auth user" },
      { name: "limit", type: "number", description: "Max records (1-200)" },
      { name: "offset", type: "number", description: "Pagination offset" },
    ],
    responseExample: { limit: 10, offset: 0, data: [{ id: 5001, status: "pending", patient_id: 10001 }] },
  },
  { method: "GET", path: "/{id}", summary: "Get a staging record by id", responseExample: { id: 5001, status: "pending", patient_id: 10001, observations: [] } },
  {
    method: "PATCH",
    path: "/{id}",
    summary: "General update (agent-side progress)",
    notes:
      "observations[], when present at all, fully replaces the existing list — omit the key entirely to leave existing " +
      "observations untouched rather than sending an empty array.",
    requestExample: { status: "completed", processed_at: "2026-01-15T09:05:00Z", summary: "Extracted 3 lab values." },
    responseExample: { id: 5001, status: "completed", processed_at: "2026-01-15T09:05:00Z" },
  },
  {
    method: "PATCH",
    path: "/{id}/review",
    summary: "Doctor review action (accept / reject / needs revision)",
    notes:
      "Deliberately a separate endpoint from the general PATCH above, so the extraction agent's writes and a reviewing " +
      "doctor's decision can never collide.",
    requestExample: { review_status: "accepted", reviewed_by: "usr_123", review_notes: "Confirmed against source PDF." },
    responseExample: { id: 5001, review_status: "accepted", reviewed_by: "usr_123", reviewed_at: "2026-01-15T10:00:00Z" },
  },
  { method: "DELETE", path: "/{id}", summary: "Delete a staging record", responseExample: { success: true } },
];

export default function FhirStagingPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">FHIR staging (AI-extraction review)</h1>
        <p className="text-sm text-muted-foreground">
          When an AI agent extracts structured data from an uploaded document (a lab PDF, a discharge
          summary), it writes a <em>staging</em> record here first — a holding area — before a doctor
          reviews and approves it into the real Condition/Observation/MedicationRequest/ServiceRequest/
          DiagnosticReport resources. Approving a staging record (<code className="rounded bg-muted px-1.5 py-0.5">review_status: &quot;accepted&quot;</code>)
          does <strong>not</strong> itself create those real FHIR resources — that&apos;s a separate, manual
          call to the resources under{" "}
          <Link href="/docs/mobile-guide/fhir" className="underline underline-offset-2">FHIR resources</Link>{" "}
          using the staging data as a starting point.
        </p>
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
          <span className="font-semibold">No authentication.</span> Unlike every other resource in this
          guide, this service does not check an Authorization header at all — org_id/user_id are plain
          fields, trusted as given. Base URL is <code className="rounded bg-black/10 px-1 dark:bg-white/10">FHIR_STAGING_SERVER_URL</code> directly
          (it already includes the full API path — don&apos;t append a resource segment).
        </p>
        <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <p><span className="font-medium">Doctor app: </span>reviewed in Clinical Records&apos; document preview (ExtractedDataPanel).</p>
        </div>
      </div>

      <div className="space-y-4">
        {ENDPOINTS.map((ep, i) => (
          <EndpointCard key={`${ep.method}-${ep.path}-${i}`} baseUrl={BASE_URL} endpoint={ep} />
        ))}
      </div>
    </div>
  );
}
