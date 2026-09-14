/**
 * StatCard — practice-overview stat summary card for the doctor dashboard.
 *
 * Layer: client / telemedicine / doctor / component / dashboard-overview
 *
 * Displays a single stat (today's appointments, pending, completed, etc.)
 * with an icon, colour-coded background, numeric value, and an optional
 * "See details" link. Mirrors the patient portal's StatCard (same shape)
 * but kept as a local copy rather than a cross-module import — doctor and
 * patient are separate top-level client modules in this codebase.
 */

"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Colour variant controls the card and icon background tones. */
type ColorVariant = "blue" | "rose" | "yellow" | "emerald" | "indigo" | "slate";

interface StatCardProps {
  /** Short label displayed in the card header (e.g. "Today", "Pending"). */
  title: string;
  /** Numeric value shown prominently in the card body. */
  value: number;
  /** Lucide icon shown alongside the count. */
  icon: LucideIcon;
  /** Colour scheme for card background and icon container. */
  colorVariant: ColorVariant;
  /** Secondary note shown in the card footer. */
  note: string;
  /** Link target for the "See details" button — omit to hide the link. */
  href?: string;
}

// ── Colour maps ───────────────────────────────────────────────────────────────

const cardBg: Record<ColorVariant, string> = {
  blue: "bg-blue-600/10 dark:bg-blue-600/20",
  rose: "bg-rose-600/10 dark:bg-rose-600/20",
  yellow: "bg-yellow-600/10 dark:bg-yellow-600/20",
  emerald: "bg-emerald-600/10 dark:bg-emerald-600/20",
  indigo: "bg-indigo-600/10 dark:bg-indigo-600/20",
  slate: "bg-slate-600/10 dark:bg-slate-600/20",
};

const iconBg: Record<ColorVariant, string> = {
  blue: "bg-blue-600/20 text-blue-600",
  rose: "bg-rose-600/20 text-rose-600",
  yellow: "bg-yellow-600/20 text-yellow-600",
  emerald: "bg-emerald-600/20 text-emerald-600",
  indigo: "bg-indigo-600/20 text-indigo-600",
  slate: "bg-slate-600/20 text-slate-600",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a coloured stat card with icon, count, and an optional details link.
 *
 * @param title - Card header label.
 * @param value - Numeric stat to display.
 * @param icon - Lucide icon component.
 * @param colorVariant - Colour scheme key.
 * @param note - Footer note text.
 * @param href - "See details" link target; omitted hides the link entirely.
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  colorVariant,
  note,
  href,
}: StatCardProps) {
  return (
    <Card className={cn("gap-0 p-0", cardBg[colorVariant])}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {href && (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-xs h-auto p-0 font-normal opacity-70 hover:opacity-100 hover:bg-transparent hover:underline"
          >
            <Link href={href}>See details</Link>
          </Button>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
              iconBg[colorVariant],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-2xl font-semibold tabular-nums">
            {value.toLocaleString()}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pb-3">
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardFooter>
    </Card>
  );
}
