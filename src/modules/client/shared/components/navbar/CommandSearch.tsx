"use client";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRouter } from "@/i18n/navigation";
import DynamicIcon from "../DynamicLucideIcon";
import { LayoutGrid, SearchIcon, Loader2 } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { useCallback, useEffect, useMemo, useState } from "react";

// ── types ─────────────────────────────────────────────────────────────────────

interface NavNode {
  id: string;
  label: string;
  slug: string;
  icon: string | null;
  href: string | null;
  type: "GROUP" | "ITEM";
  /** Same visibility flag the left sidebar (MenuBar) filters on — an
   *  invisible node, and everything under it, must not appear here either. */
  isVisible: boolean;
  children: NavNode[];
}

interface AppEntry {
  id: string;
  name: string;
  slug: string;
  menus: NavNode[];
}

/** Shape of GET {BETTER_AUTH_URL}/api/me/context — same endpoint MenuBar reads. */
interface ContextResponse {
  apps: AppEntry[];
  permissions: string[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

interface FlatItem {
  label: string;
  href: string;
  icon: string | null;
  group: string;
}

function collectItems(nodes: NavNode[], groupLabel: string, out: FlatItem[]) {
  for (const node of nodes) {
    // Mirrors MenuBar's buildNavGroups: an invisible node hides its whole
    // subtree, not just itself, so items behind a hidden group never surface.
    if (!node.isVisible) continue;
    if (node.type === "ITEM" && node.href) {
      out.push({
        label: node.label,
        href: node.href,
        icon: node.icon,
        group: groupLabel,
      });
    }
    if (node.children?.length) {
      const nextGroup =
        node.type === "GROUP" && node.label ? node.label : groupLabel;
      collectItems(node.children, nextGroup, out);
    }
  }
}

function buildData(apps: AppEntry[]) {
  const menuGroups = new Map<string, FlatItem[]>();

  for (const app of apps) {
    const items: FlatItem[] = [];
    collectItems(app.menus, app.name, items);
    for (const item of items) {
      const bucket = menuGroups.get(item.group) ?? [];
      bucket.push(item);
      menuGroups.set(item.group, bucket);
    }
  }

  return { apps, menuGroups };
}

const validIconName = (
  name: string | null,
): name is keyof typeof dynamicIconImports =>
  !!name && name in dynamicIconImports;

// ── component ─────────────────────────────────────────────────────────────────

interface ICommandSearchProps {
  /** Better Auth active organization id — same param MenuBar's own fetch uses. */
  orgId?: string | null;
}

export function CommandSearch({ orgId }: ICommandSearchProps) {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetches the same permission-filtered nav tree MenuBar uses — not the
  // session-baked apps the layout passes down, which doesn't carry isVisible
  // at all (that mismatch is what caused this to show either everything,
  // unfiltered, or nothing at all — see AppNavbar/layout.tsx history). One
  // source of truth for "what's visible to this user" for both surfaces.
  const fetchContext = useCallback((activeOrgId?: string | null) => {
    const base = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
    const url = activeOrgId
      ? `${base}/api/me/context?organizationId=${activeOrgId}`
      : `${base}/api/me/context`;

    setIsLoading(true);
    return fetch(url, { credentials: "include" })
      .then((res) => res.json() as Promise<ContextResponse>)
      .then((data) => setApps(data.apps ?? []))
      .catch(() => setApps([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchContext(orgId);
  }, [fetchContext, orgId]);

  const { apps: appList, menuGroups } = useMemo(
    () => buildData(apps),
    [apps],
  );

  const close = () => setOpen(false);

  return (
    <>
      <Button
        variant="outline"
        className="bg-muted/25 group text-muted-foreground hover:bg-accent relative h-8 w-full flex-1 justify-start rounded-md text-sm font-normal shadow-none sm:w-40 sm:pe-12 md:flex-none lg:w-52 xl:w-64 flex items-center"
        onClick={() => setOpen(true)}
      >
        <SearchIcon
          aria-hidden="true"
          className="absolute inset-s-1.5 top-1/2 -translate-y-1/2"
          size={16}
        />
        <span className="ms-4">Search</span>
        <kbd className="bg-muted group-hover:bg-accent pointer-events-none absolute inset-e-[0.3rem] top-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog modal open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search apps and pages..." />
        <CommandList className="max-h-80 overflow-y-auto">
          <CommandEmpty>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Loading…
              </span>
            ) : (
              "No results found."
            )}
          </CommandEmpty>

          {/* ── Apps ── */}
          {appList.length > 0 && (
            <CommandGroup heading="Apps">
              {appList.map((app) => (
                <CommandItem
                  key={app.id}
                  onSelect={() => { close(); router.push(`/bezs/${app.slug}`); }}
                >
                  <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
                  <span>{app.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Menu items grouped ── */}
          {menuGroups.size > 0 && (
            <>
              {appList.length > 0 && <CommandSeparator />}
              {Array.from(menuGroups.entries()).map(([groupLabel, items]) => (
                <CommandGroup key={groupLabel} heading={groupLabel}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.href}
                      onSelect={() => { close(); router.push(item.href); }}
                    >
                      {validIconName(item.icon) ? (
                        <DynamicIcon
                          name={item.icon}
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      ) : (
                        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
