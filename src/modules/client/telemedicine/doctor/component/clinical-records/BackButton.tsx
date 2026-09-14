/**
 * @file BackButton.tsx
 * @description Generic "Back" button for the Clinical Records route hierarchy.
 * Uses the browser session history (`router.back()`) instead of a fixed href so
 * it always returns the doctor to wherever they actually navigated from —
 * including deep links that skip intermediate Clinical Records pages (e.g. the
 * Dashboard's "Clinical Records" button jumping straight to the workspace page)
 * — rather than always routing back through the route's parent segment.
 * @layer client/telemedicine/doctor/component/clinical-records
 */

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Renders a "Back" button that navigates to the previous entry in the
 * browser's session history.
 *
 * Note: on a fresh page load (hard refresh, opened in a new tab, or a direct
 * link with no prior in-app history), there is nothing to go back to and the
 * button becomes a no-op — an accepted tradeoff for always being correct
 * about "back" when real in-app navigation history exists.
 */
export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 -ml-2 text-muted-foreground print:hidden"
      onClick={() => router.back()}
    >
      <ArrowLeft className="size-4" />
      Back
    </Button>
  );
}
