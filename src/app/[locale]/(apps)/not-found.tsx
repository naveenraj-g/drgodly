/**
 * In-app 404 page — telemedicine app section.
 *
 * Layer: app / pages
 *
 * Rendered whenever `notFound()` is thrown from a page/layout nested under
 * (apps), or the URL simply doesn't match any route in this segment. Since
 * this file lives inside the (apps) route group, Next.js renders it wrapped
 * by (apps)/layout.tsx — the sidebar (MenuBar) and top AppNavbar are already
 * on screen, so the user can navigate away without hitting the back button.
 */

import { FileQuestion } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/** Static 404 page. No session check needed — (apps)/layout.tsx already guards auth. */
export default function AppsNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or may have
          been moved.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/bezs">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
