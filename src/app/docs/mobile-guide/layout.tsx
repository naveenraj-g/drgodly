/**
 * Layout for /docs/mobile-guide/* — the mobile integration guide shell.
 *
 * Layer: app / docs / mobile-guide
 *
 * Sticky top navbar (DocsTopNav) + fixed left nav (DocsNav, lg+ only) +
 * scrollable content column. The top navbar is what makes the guide
 * navigable below the lg breakpoint, where the sidebar is hidden — its menu
 * button opens the same DocsNav in a slide-over. No auth guard, no locale —
 * this is developer reference for an external mobile team, not part of the
 * patient/doctor portal.
 */

import { DocsNav } from "@/modules/client/docs/components/DocsNav";
import { DocsTopNav } from "@/modules/client/docs/components/DocsTopNav";

export default function MobileGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DocsTopNav />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r px-4 py-6 lg:block">
          <DocsNav />
        </aside>
        <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
