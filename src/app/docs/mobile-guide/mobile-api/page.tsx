/**
 * /docs/mobile-guide/mobile-api — summary of this app's own Intake/
 * Consultation/AiConsultation REST API, linking to the full OpenAPI reference.
 *
 * Layer: app / docs / mobile-guide
 *
 * Deliberately does not re-document every field here — that's already
 * exhaustively covered (and guaranteed in sync with the actual routes) by
 * /api/mobile/docs (Scalar, generated from mobile-api.registry.ts). This
 * page just orients: what this API is for, and why it's a different auth/
 * shape story from FHIR and the agents.
 */

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const ENDPOINTS: { resource: string; ops: string[] }[] = [
  { resource: "Intake", ops: ["create", "update", "link", "abandon", "get-by-id", "get-by-appointment", "list"] },
  { resource: "Consultation", ops: ["create", "complete", "save-clinical-data", "abandon", "get-by-appointment", "list"] },
  { resource: "AiConsultation", ops: ["create", "update", "link", "abandon", "get-by-id"] },
];

export default function MobileApiPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Mobile API</h1>
        <p className="text-sm text-muted-foreground">
          Proprietary application data that has no FHIR equivalent — pre-appointment intake sessions,
          virtual consultation room state (transcript, SOAP note, staged clinical resources), and
          standalone AI-consultation sessions. Lives in this app&apos;s own Postgres database, exposed at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">/api/{"{intake,consultation,ai-consultation}"}/…</code>,
          same bearer JWT as FHIR and the AI agents (see{" "}
          <Link href="/docs/mobile-guide/auth" className="underline underline-offset-2">Authentication</Link>).
        </p>
        <p className="text-sm text-muted-foreground">
          Unlike FHIR (mobile calls the FHIR host directly) and the AI agents (mobile calls the agent
          host directly), this API <em>is</em> this Next.js app itself — there&apos;s no other host to skip
          to, this is the actual backend for this data.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-2 pt-4">
          <p className="text-sm font-medium">Full interactive reference</p>
          <p className="text-sm text-muted-foreground">
            Every field, every status code, every example — generated from the same Zod schemas the routes
            themselves validate against, so it can never drift from the real contract.
          </p>
          {/* Plain <a>, not <Link> — /api/mobile/docs is a route handler returning raw HTML
              (Scalar), not a Next.js page, so it belongs outside the client router. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/mobile/docs"
            className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            Open the Mobile API reference →
          </a>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-sm font-medium">Quick map of what exists</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {ENDPOINTS.map((e) => (
            <Card key={e.resource}>
              <CardContent className="space-y-1.5 pt-4">
                <p className="text-sm font-medium">{e.resource}</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {e.ops.map((op) => (
                    <li key={op}>
                      <code className="rounded bg-muted px-1 py-0.5">/api/{e.resource === "AiConsultation" ? "ai-consultation" : e.resource.toLowerCase()}/{op}</code>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium">userId / user_id / published_by are always taken from your bearer token</span> — never
        send them in the request body, they&apos;re ignored if you do. org_id is the same: always taken from
        the token, never read from the body.
      </p>
    </div>
  );
}
