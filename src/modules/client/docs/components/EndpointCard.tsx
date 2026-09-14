/**
 * EndpointCard.tsx — one HTTP endpoint's full reference: method, URL, params,
 * request/response examples.
 *
 * Layer: client / docs / components
 *
 * The core repeating unit of every FHIR resource page — one card per
 * operation (create/list/get/update/...), so "everything: payload, body,
 * search params, response" is covered per endpoint without hand-writing
 * per-resource JSX.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { EndpointDoc } from "@/modules/client/docs/types";
import { MethodBadge } from "./Badges";
import { CodeBlock } from "./CodeBlock";

export function EndpointCard({
  baseUrl,
  endpoint,
}: {
  /** e.g. "{FHIR_GQL_URL}/patients" — endpoint.path is appended to this. */
  baseUrl: string;
  endpoint: EndpointDoc;
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={endpoint.method} />
          <code className="text-sm font-medium">
            {baseUrl}
            {endpoint.path}
          </code>
        </div>
        <p className="text-sm text-muted-foreground">{endpoint.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {endpoint.notes && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {endpoint.notes}
          </p>
        )}

        {endpoint.queryParams && endpoint.queryParams.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Query params</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Name</th>
                    <th className="px-3 py-1.5 text-left font-medium">Type</th>
                    <th className="px-3 py-1.5 text-left font-medium">Required</th>
                    <th className="px-3 py-1.5 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.queryParams.map((p) => (
                    <tr key={p.name} className="border-t">
                      <td className="px-3 py-1.5 font-mono">{p.name}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{p.type}</td>
                      <td className="px-3 py-1.5">{p.required ? "Yes" : "No"}</td>
                      <td className="px-3 py-1.5">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {endpoint.requestExample !== undefined && (
          <CodeBlock label="Request body" value={endpoint.requestExample} />
        )}

        <CodeBlock label="Response body" value={endpoint.responseExample} />
      </CardContent>
    </Card>
  );
}
