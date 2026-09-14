/**
 * /docs/mobile-guide/fhir/[resource] — one FHIR resource's full reference page.
 *
 * Layer: app / docs / mobile-guide / fhir
 *
 * Generic template rendered once per entry in fhirResources.data.ts — adding
 * a resource means extending that data file, not writing new JSX. Statically
 * generated for every known resource via generateStaticParams.
 */

import { notFound } from "next/navigation";
import { FHIR_RESOURCES } from "@/modules/client/docs/data/fhirResources.data";
import { EndpointCard } from "@/modules/client/docs/components/EndpointCard";

export function generateStaticParams() {
  return FHIR_RESOURCES.map((r) => ({ resource: r.slug }));
}

export default async function FhirResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const doc = FHIR_RESOURCES.find((r) => r.slug === resource);
  if (!doc) notFound();

  const baseUrl = `{FHIR_GQL_URL}${doc.basePath}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{doc.title}</h1>
        <p className="text-sm text-muted-foreground">{doc.description}</p>
        <p className="text-xs text-muted-foreground">
          Base URL: <code className="rounded bg-muted px-1.5 py-0.5">{baseUrl}</code> · every
          endpoint below requires <code className="rounded bg-muted px-1.5 py-0.5">Authorization: Bearer &lt;JWT&gt;</code>
        </p>
        {(doc.usage.patient || doc.usage.doctor) && (
          <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs">
            {doc.usage.patient && <p><span className="font-medium">Patient app: </span>{doc.usage.patient}</p>}
            {doc.usage.doctor && <p><span className="font-medium">Doctor app: </span>{doc.usage.doctor}</p>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {doc.endpoints.map((ep, i) => (
          <EndpointCard key={`${ep.method}-${ep.path}-${i}`} baseUrl={baseUrl} endpoint={ep} />
        ))}
      </div>
    </div>
  );
}
