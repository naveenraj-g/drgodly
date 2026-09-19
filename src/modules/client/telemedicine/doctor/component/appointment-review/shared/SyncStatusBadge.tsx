/**
 * SyncStatusBadge — per-item "In EMR" / "Draft" indicator.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review / shared
 *
 * Shown on a clinical extraction card only once this encounter has been
 * confirmed at least once (see AppointmentReview's `publishedSnapshot`) — on
 * first review everything is unconfirmed by definition, so the badge would
 * be pure noise. After that first confirm, it tells the doctor at a glance
 * which specific items (or edits) haven't been pushed to the EMR yet.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { CloudCheck, FileClock } from "lucide-react";

interface SyncStatusBadgeProps {
  /** Omit to render nothing (used before the first confirm, when it's meaningless). */
  status?: "synced" | "draft";
}

/**
 * @param status - "synced" (identical to the EMR) or "draft" (not yet pushed).
 */
export function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
  if (!status) return null;

  if (status === "synced") {
    return (
      <Badge
        variant="outline"
        className="gap-1 shrink-0 text-xs text-emerald-600 border-emerald-600/30 bg-emerald-500/10"
      >
        <CloudCheck className="h-3 w-3" />
        In EMR
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 shrink-0 text-xs text-amber-600 border-amber-600/30 bg-amber-500/10"
    >
      <FileClock className="h-3 w-3" />
      Draft
    </Badge>
  );
}
