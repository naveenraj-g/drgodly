/**
 * DocsTopNav.tsx — sticky top navbar for /docs/mobile-guide.
 *
 * Layer: client / docs / components
 *
 * The left sidebar (DocsNav) is only shown at the lg breakpoint, so this
 * navbar is what makes the guide navigable at all on small/medium screens —
 * its menu button opens the same DocsNav inside a Sheet. At every
 * breakpoint it also gives a fixed point of orientation (title + link back
 * to the main app) that scrolling content shouldn't carry away.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DocsNav } from "./DocsNav";
import { ThemeToggle } from "./ThemeToggle";

export function DocsTopNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm lg:px-10">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b px-4 py-4">
              <SheetTitle className="text-sm">Drgodly Mobile Guide</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-4 py-4" onClick={() => setOpen(false)}>
              <DocsNav />
            </div>
          </SheetContent>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 lg:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
        </Sheet>

        <Link href="/docs/mobile-guide" className="text-sm font-semibold">
          Drgodly Mobile Guide
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          Back to Drgodly →
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
