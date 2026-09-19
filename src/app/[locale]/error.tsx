/**
 * Locale-wide error boundary fallback.
 *
 * Layer: app / pages
 *
 * Catches uncaught rendering errors anywhere under a locale segment that
 * aren't already handled by a more specific error.tsx (e.g. (apps)/error.tsx,
 * which additionally shows the app navbar). Covers the (marketing) and
 * (auth) route groups, which have no navbar of their own.
 *
 * Must be a Client Component — error boundaries only work client-side.
 */

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Renders when a rendering error escapes any page/layout under this locale
 * that isn't already caught by a more specific error boundary.
 *
 * @param error - The thrown error, with an optional `digest` matching server logs.
 * @param unstable_retry - Re-renders the failed segment without a full reload.
 */
export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[locale] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <AlertTriangle className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          An unexpected error occurred while loading this page.
          {error.digest && (
            <>
              <br />
              Error reference: {error.digest}
            </>
          )}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => unstable_retry()}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
