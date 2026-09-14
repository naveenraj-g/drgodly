/**
 * DocsNav.tsx — sidebar navigation for /docs/mobile-guide.
 *
 * Layer: client / docs / components
 *
 * Plain flex nav rather than the shared shadcn Sidebar suite — this route
 * tree has its own root layout (src/app/docs/layout.tsx) with no ancestor
 * SidebarProvider to nest under, but a static docs nav has no need for a
 * collapsible/persisted sidebar's extra machinery either. Uses plain
 * next/link + next/navigation (not the @/i18n/navigation wrappers) since
 * /docs sits outside next-intl's locale routing entirely.
 *
 * The FHIR and AI Agents groups append their sub-links from FHIR_RESOURCES /
 * AGENTS at render time so the nav can never list a resource/agent that the
 * corresponding data file doesn't actually define a page for.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/modules/client/docs/data/navItems";
import { FHIR_RESOURCES } from "@/modules/client/docs/data/fhirResources.data";
import { AGENTS } from "@/modules/client/docs/data/agents.data";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-secondary font-medium text-secondary-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function DocsNav() {
  return (
    <nav className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="space-y-0.5">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
            {group.title}
          </p>
          {group.links.map((link) => (
            <NavItem key={link.href} href={link.href} label={link.label} />
          ))}
        </div>
      ))}

      {FHIR_RESOURCES.length > 0 && (
        <div className="space-y-0.5 pl-3">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground/50">
            FHIR resources
          </p>
          {FHIR_RESOURCES.map((r) => (
            <NavItem key={r.slug} href={`/docs/mobile-guide/fhir/${r.slug}`} label={r.title} />
          ))}
        </div>
      )}

      {AGENTS.length > 0 && (
        <div className="space-y-0.5 pl-3">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground/50">
            AI agents
          </p>
          {AGENTS.map((a) => (
            <NavItem key={a.slug} href={`/docs/mobile-guide/agents/${a.slug}`} label={a.title} />
          ))}
        </div>
      )}
    </nav>
  );
}
