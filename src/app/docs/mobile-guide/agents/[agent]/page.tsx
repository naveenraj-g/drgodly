/**
 * /docs/mobile-guide/agents/[agent] — one AI agent's full reference page.
 *
 * Layer: app / docs / mobile-guide / agents
 *
 * Generic template rendered once per entry in agents.data.ts — adding an
 * agent means extending that data file, not writing new JSX. Statically
 * generated for every known agent via generateStaticParams.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { AGENTS } from "@/modules/client/docs/data/agents.data";
import { MethodBadge, StreamBadge } from "@/modules/client/docs/components/Badges";
import { CodeBlock } from "@/modules/client/docs/components/CodeBlock";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function generateStaticParams() {
  return AGENTS.map((a) => ({ agent: a.slug }));
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agent: string }>;
}) {
  const { agent } = await params;
  const doc = AGENTS.find((a) => a.slug === agent);
  if (!doc) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{doc.title}</h1>
        <p className="text-sm text-muted-foreground">{doc.description}</p>
        <p className="text-xs text-muted-foreground">
          Env var: <code className="rounded bg-muted px-1.5 py-0.5">{doc.envVar}</code> · example:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">{doc.exampleUrl}</code>
        </p>
        <p className="text-xs text-muted-foreground">
          Auth: <code className="rounded bg-muted px-1.5 py-0.5">Authorization: Bearer &lt;JWT&gt;</code> — same
          token as everywhere else, see{" "}
          <Link href="/docs/mobile-guide/auth" className="underline underline-offset-2">
            Authentication
          </Link>
          .
        </p>
        {(doc.usage.patient || doc.usage.doctor) && (
          <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs">
            {doc.usage.patient && <p><span className="font-medium">Patient app: </span>{doc.usage.patient}</p>}
            {doc.usage.doctor && <p><span className="font-medium">Doctor app: </span>{doc.usage.doctor}</p>}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={doc.method} />
            <code className="text-sm font-medium">
              {doc.exampleUrl}
              {doc.path === "/" ? "" : doc.path}
            </code>
            <StreamBadge streaming={doc.streaming} />
          </div>
          {doc.contentType && (
            <p className="text-xs text-muted-foreground">
              Content-Type: <code className="rounded bg-muted px-1.5 py-0.5">{doc.contentType}</code>
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {doc.notes && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              {doc.notes}
            </p>
          )}

          <CodeBlock label="Request" value={doc.requestExample} />

          {doc.sessionContinuity && (
            <p className="rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-700 dark:text-violet-400">
              <span className="font-medium">Session continuity: </span>
              {doc.sessionContinuity}
            </p>
          )}

          {doc.streaming ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Response — one JSON object per event (line-delimited or concatenated; parse incrementally, don&apos;t assume one event per chunk)
              </p>
              {doc.events?.map((ev) => (
                <div key={ev.type} className="space-y-1 rounded-lg border p-3">
                  <p className="text-xs">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-semibold">{ev.type}</code>{" "}
                    <span className="text-muted-foreground">{ev.description}</span>
                  </p>
                  <CodeBlock value={ev.example} />
                </div>
              ))}
            </div>
          ) : (
            <CodeBlock label="Response" value={doc.responseExample} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
