/**
 * /docs/mobile-guide/attachments — file upload/download reference page.
 *
 * Layer: app / docs / mobile-guide
 *
 * Unlike FHIR and the AI agents, FileNest's upload token and download-URL
 * minting CANNOT be called directly by mobile with just its own bearer JWT
 * — the FileNest API key has to stay server-only, so these two endpoints
 * stay as Next.js proxies gated by a browser session cookie today. Flagged
 * explicitly below as a gap: unlike every other system in this guide,
 * mobile needs new bearer-JWT-gated equivalents built for these two routes
 * before it can use them at all.
 */

import { EndpointCard } from "@/modules/client/docs/components/EndpointCard";
import { CodeBlock } from "@/modules/client/docs/components/CodeBlock";
import type { EndpointDoc } from "@/modules/client/docs/types";

const TOKEN_ENDPOINT: EndpointDoc = {
  method: "POST",
  path: "",
  summary: "Mint a scoped upload token",
  requestExample: {
    filePath: "10042/servicerequest",
    allowedMimeTypes: ["application/pdf", "image/jpeg"],
    maxSize: 52428800,
    maxFiles: 10,
    metadata: { serviceRequestId: 80007, patientFhirId: 10042 },
  },
  responseExample: { token: "eyJhbGci...", expiresAt: "2026-01-15T09:30:00Z", constraints: { allowedMimeTypes: ["application/pdf"], maxSize: 52428800, maxFiles: 10 } },
};

const DOWNLOAD_ENDPOINT: EndpointDoc = {
  method: "GET",
  path: "",
  summary: "Get a presigned view/download URL for an existing file",
  queryParams: [
    { name: "fileId", type: "string", required: true, description: "The FileNest file id stored on the FHIR attachment" },
    { name: "disposition", type: "string", description: "\"inline\" (view in-app) or \"attachment\" (force download); default \"attachment\"" },
  ],
  responseExample: { url: "https://cdn.filenest.example/signed/...", expiresAt: "2026-01-15T10:30:00Z" },
};

export default function AttachmentsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">File attachments (FileNest)</h1>
        <p className="text-sm text-muted-foreground">
          Every document/photo/lab-result file in this app — patient lab uploads, doctor order results,
          profile photos, DiagnosticReport/DocumentReference attachments — is stored in FileNest, referenced
          everywhere else only by an opaque <code className="rounded bg-muted px-1.5 py-0.5">fileId</code> string.
        </p>
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
          <span className="font-semibold">Gap: mobile can&apos;t call this yet.</span> Both endpoints below
          are gated by a browser session cookie (<code className="rounded bg-black/10 px-1 dark:bg-white/10">getServerSession()</code>),
          not a bearer token — unlike every FHIR/agent endpoint in this guide. They need bearer-JWT-gated
          proxies built (same treatment given to Intake/Consultation/AiConsultation) before mobile can upload
          or resolve attachment URLs at all.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Step 1 — mint an upload token</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5">POST /api/filenest-token</code>. All body fields
          optional — omit <code className="rounded bg-muted px-1.5 py-0.5">filePath</code> to fall back to
          legacy <code className="rounded bg-muted px-1.5 py-0.5">?patientFhirId=&amp;folder=</code> query params. Token
          is valid for 10 minutes.
        </p>
        <EndpointCard baseUrl="/api/filenest-token" endpoint={TOKEN_ENDPOINT} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Step 2 — upload the file (no FileNest SDK needed)</h2>
        <p className="text-sm text-muted-foreground">
          Three raw HTTP calls, using the token from step 1 as a bearer token against FileNest itself
          (not our app) at <code className="rounded bg-muted px-1.5 py-0.5">{"{FILENEST_API_URL}"}</code>:
        </p>

        <div className="space-y-1.5">
          <p className="text-xs font-medium">2a — Init upload</p>
          <CodeBlock value={"POST {FILENEST_API_URL}/v1/projects/{FILENEST_PROJECT_ID}/files/upload\nAuthorization: Bearer <token from step 1>\nContent-Type: application/json"} />
          <CodeBlock label="Body" value={{ filename: "lab-result.pdf", content_type: "application/pdf", size_bytes: 204800, folder_id: null, metadata: {}, tags: [] }} />
          <CodeBlock label="Response" value={{ file_id: "fn_abc123", upload_url: "https://...", expires_at: "2026-01-15T09:20:00Z" }} />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium">2b — Upload the bytes</p>
          <CodeBlock value={"PUT {upload_url from 2a}\nContent-Type: <file's real mime type>\n\n<raw file bytes>"} />
          <p className="text-xs text-muted-foreground">No auth header needed — the URL itself is presigned.</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium">2c — Confirm</p>
          <CodeBlock value={"POST {FILENEST_API_URL}/v1/projects/{FILENEST_PROJECT_ID}/files/{file_id}/confirm\nAuthorization: Bearer <token from step 1>"} />
          <p className="text-xs text-muted-foreground">Empty body. Response is empty/204.</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium">2d — (optional) fetch the file record</p>
          <CodeBlock value={"GET {FILENEST_API_URL}/v1/projects/{FILENEST_PROJECT_ID}/files/{file_id}\nAuthorization: Bearer <token from step 1>"} />
          <CodeBlock label="Response" value={{ id: "fn_abc123", filename: "lab-result.pdf", content_type: "application/pdf", size_bytes: 204800 }} />
          <p className="text-xs text-muted-foreground">
            The resulting <code className="rounded bg-muted px-1 py-0.5">file_id</code> is what gets embedded as e.g.{" "}
            <code className="rounded bg-muted px-1 py-0.5">DiagnosticReport.presented_form[].url</code> when creating
            the FHIR resource this file belongs to.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Viewing/downloading an existing file</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5">GET /api/filenest-download-url</code> — the recommended path;
          simpler than replicating FileNest&apos;s own download flow. Fetch this, then GET the returned{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">url</code> directly (presigned, no auth needed on that second hop).
          URL is valid for 1 hour.
        </p>
        <EndpointCard baseUrl="/api/filenest-download-url" endpoint={DOWNLOAD_ENDPOINT} />
      </section>
    </div>
  );
}
