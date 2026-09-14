/**
 * Root layout for the /docs branch.
 *
 * Layer: app / docs
 *
 * /docs sits outside src/app/[locale]/... entirely (see src/proxy.ts's
 * middleware matcher, which excludes /docs from locale routing), so nothing
 * above this provides <html>/<body> — this layout must be a complete root
 * layout in its own right, same requirement src/app/[locale]/layout.tsx
 * fulfills for the rest of the app. Deliberately minimal: no next-intl
 * provider (no i18n here), no QueryProvider (this branch is static
 * reference content, no data fetching), no Toaster/NextTopLoader — just the
 * font, global styles, and theme support so shadcn components render
 * correctly in both light and dark mode.
 */

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/theme/ThemeProvider";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Drgodly Mobile Integration Guide",
  description: "How to build a mobile app against Drgodly's FHIR, FHIR-staging, AI agent, and Mobile APIs.",
};

export default function DocsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
