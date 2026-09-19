/**
 * In-app error boundary — telemedicine app section.
 *
 * Layer: app / pages
 *
 * Catches uncaught rendering errors thrown by any page/layout nested under
 * (apps). Since this file lives inside the (apps) route group, Next.js
 * renders it wrapped by (apps)/layout.tsx — the sidebar (MenuBar) and top
 * AppNavbar stay on screen, so the user can navigate away instead of being
 * stuck on a broken page with no way out.
 *
 * Must be a Client Component — error boundaries only work client-side.
 */

"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Renders when a rendering error escapes any (apps) page/layout.
 *
 * @param error - The thrown error, with an optional `digest` matching server logs.
 * @param unstable_retry - Re-renders the failed segment without a full reload.
 */
export default function AppsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[apps] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
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
          <Link href="/bezs">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
