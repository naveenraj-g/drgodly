/**
 * Badges.tsx — small colored labels used throughout the mobile-guide docs.
 *
 * Layer: client / docs / components
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  POST: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  PATCH: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  DELETE: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

/** Colored HTTP method pill (GET/POST/PATCH/PUT/DELETE). */
export function MethodBadge({ method }: { method: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[11px] font-semibold", METHOD_COLORS[method])}
    >
      {method}
    </Badge>
  );
}

/** Marks a response as streaming (NDJSON/SSE) vs a plain JSON body. */
export function StreamBadge({ streaming }: { streaming: boolean }) {
  return streaming ? (
    <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" variant="outline">
      Streaming response
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Plain JSON response
    </Badge>
  );
}
