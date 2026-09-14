/**
 * /docs/mobile-guide/fhir — FHIR resource index.
 *
 * Layer: app / docs / mobile-guide / fhir
 */

import Link from "next/link";
import { FHIR_RESOURCES } from "@/modules/client/docs/data/fhirResources.data";
import { Card, CardContent } from "@/components/ui/card";

export default function FhirIndexPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">FHIR resources</h1>
        <p className="text-sm text-muted-foreground">
          Core clinical data — Patient, Appointment, Condition, Observation, and everything else this app
          stores in the FHIR-GQL backend. The mobile app calls these endpoints directly, at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">{"{FHIR_GQL_URL}"}</code>, using the same bearer
          JWT documented in{" "}
          <Link href="/docs/mobile-guide/auth" className="underline underline-offset-2">
            Authentication
          </Link>{" "}
          — this is exactly what the web app&apos;s server actions call server-side, so every payload shape
          below is already validated and in production use.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FHIR_RESOURCES.map((r) => (
          <Link key={r.slug} href={`/docs/mobile-guide/fhir/${r.slug}`}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="space-y-1 pt-4">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
