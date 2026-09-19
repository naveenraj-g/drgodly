/**
 * Global 404 — catches every unmatched URL, including a locale-valid path
 * whose deeper segments match nothing (e.g. /en/nonsense).
 *
 * Layer: app / pages
 *
 * Distinct from (apps)/not-found.tsx, which handles a `notFound()` call
 * thrown from *within* an already-matched (apps) page (e.g. a missing
 * appointment ID) and renders inside the normal (apps) layout chain, navbar
 * included.
 *
 * This file exists because this app's root layout lives at
 * [locale]/layout.tsx — a dynamic top-level segment, not a plain
 * app/layout.tsx — so Next.js has no single non-dynamic layout to compose a
 * 404 page through. A sibling [locale]/not-found.tsx was tried first and
 * removed: Turbopack hung indefinitely compiling the synthetic /_not-found
 * route for any unmatched URL, confirmed by isolating the file (removing it
 * alone fixed the hang; this file + the `experimental.globalNotFound` flag
 * in next.config.ts is what replaces it, and resolves such requests in
 * well under a second in local testing).
 *
 * Bypasses the app's normal rendering entirely (no [locale]/layout.tsx, no
 * providers, no navbar) — must import its own globals.css and font, and
 * needs a full <html>/<body> document.
 */

import "./globals.css";
import { DM_Sans } from "next/font/google";
import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Page Not Found | DrGodly",
  description: "The page you are looking for does not exist.",
};

/** Static global 404 page — no locale, session, or provider context available here. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={dmSans.className}>
      <body className="antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              The page you&apos;re looking for doesn&apos;t exist or may have
              been moved.
            </p>
          </div>
          <Button asChild variant="outline">
            {/* next/link, not the @/i18n/navigation Link — this page
                bypasses the [locale] segment entirely, so there is no
                locale to build a locale-prefixed route href against. */}
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </body>
    </html>
  );
}
