/**
 * /docs/mobile-guide/agents — AI agent index.
 *
 * Layer: app / docs / mobile-guide / agents
 */

import Link from "next/link";
import { AGENTS } from "@/modules/client/docs/data/agents.data";
import { Card, CardContent } from "@/components/ui/card";
import { StreamBadge } from "@/modules/client/docs/components/Badges";

export default function AgentsIndexPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">AI agents</h1>
        <p className="text-sm text-muted-foreground">
          The web app talks to these Python agent microservices through a thin Next.js proxy whose only
          job is minting a bearer JWT from the browser&apos;s session cookie (see each proxy&apos;s{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">src/app/api/*-agent/route.ts</code>). Mobile
          doesn&apos;t have that cookie problem — it can mint the same JWT itself (see{" "}
          <Link href="/docs/mobile-guide/auth" className="underline underline-offset-2">
            Authentication
          </Link>
          ) and call each agent&apos;s host directly, skipping our proxy layer entirely.
        </p>
        <p className="text-xs text-muted-foreground">
          Not covered here: <code className="rounded bg-muted px-1.5 py-0.5">/api/data-fetch</code> (a
          generic admin data-grid proxy, not an agent) and{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">/api/workflow/*</code> (the doctor/admin
          &quot;EMR guided workflow&quot; tool — requires a session cookie, not a bearer token, and isn&apos;t
          part of the core patient/doctor journeys).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {AGENTS.map((a) => (
          <Link key={a.slug} href={`/docs/mobile-guide/agents/${a.slug}`}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="space-y-1.5 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  <StreamBadge streaming={a.streaming} />
                </div>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
