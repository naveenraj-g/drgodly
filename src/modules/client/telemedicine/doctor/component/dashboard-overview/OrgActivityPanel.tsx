/**
 * OrgActivityPanel — organisation-wide AI Intake / AI Consultation activity
 * for the practice-overview dashboard.
 *
 * Layer: client / telemedicine / doctor / component / dashboard-overview
 *
 * Neither the AI Intake nor AI Consultation resources accept a
 * `practitioner_id` filter (only `user_id`/`org_id`/`status` — confirmed
 * against ListIntakesValidationSchema / ListConsultationsValidationSchema),
 * so this panel is explicitly organisation-wide rather than personal —
 * labelled as such so it's never mistaken for "your" sessions.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Bot, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityBreakdown {
  /** Total record count (up to the fetch limit — see caller). */
  total: number;
  /** Count per status code. */
  byStatus: Record<string, number>;
}

interface OrgActivityPanelProps {
  /** AI Intake session breakdown (IN_PROGRESS | COMPLETED | ABANDONED). */
  intake: ActivityBreakdown;
  /** AI Consultation session breakdown (WAITING | ACTIVE | COMPLETED | ABANDONED). */
  consultation: ActivityBreakdown;
}

// ── Status meta ───────────────────────────────────────────────────────────────

const INTAKE_STATUS_META: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: "In Progress", color: "#d97706" }, // amber-600
  COMPLETED: { label: "Completed", color: "#059669" }, // emerald-600
  ABANDONED: { label: "Abandoned", color: "#6b7280" }, // gray-500
};

const CONSULTATION_STATUS_META: Record<string, { label: string; color: string }> = {
  WAITING: { label: "Waiting", color: "#64748b" }, // slate-500
  ACTIVE: { label: "Active", color: "#2563eb" }, // blue-600
  COMPLETED: { label: "Completed", color: "#059669" }, // emerald-600
  ABANDONED: { label: "Abandoned", color: "#6b7280" }, // gray-500
};

// ── Sub-component: one stacked-bar row ────────────────────────────────────────

/**
 * A single labelled row: title + total, a thin stacked bar, and a text
 * legend of status counts below (identity is never color-alone).
 */
function ActivityRow({
  icon: Icon,
  title,
  breakdown,
  statusMeta,
}: {
  icon: typeof Bot;
  title: string;
  breakdown: ActivityBreakdown;
  statusMeta: Record<string, { label: string; color: string }>;
}) {
  const segments = Object.entries(breakdown.byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      count,
      label: statusMeta[status]?.label ?? status,
      color: statusMeta[status]?.color ?? "#6b7280",
    }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Icon className="size-3.5 text-muted-foreground" />
          {title}
        </p>
        <span className="text-sm font-semibold tabular-nums">
          {breakdown.total}
        </span>
      </div>

      {segments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No sessions yet.</p>
      ) : (
        <>
          {/* Thin stacked bar — 2px surface gap between segments */}
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
            {segments.map((seg) => (
              <div
                key={seg.status}
                className="h-full rounded-full"
                style={{
                  width: `${(seg.count / breakdown.total) * 100}%`,
                  backgroundColor: seg.color,
                }}
                title={`${seg.label}: ${seg.count}`}
              />
            ))}
          </div>

          {/* Text legend — counts, never color-alone */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {segments.map((seg) => (
              <span
                key={seg.status}
                className="flex items-center gap-1 text-[11px] text-muted-foreground"
              >
                <span
                  className={cn("size-1.5 rounded-full shrink-0")}
                  style={{ backgroundColor: seg.color }}
                />
                {seg.label} ({seg.count})
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders organisation-wide AI Intake and AI Consultation activity breakdowns.
 *
 * @param intake - AI Intake status breakdown.
 * @param consultation - AI Consultation status breakdown.
 */
export function OrgActivityPanel({ intake, consultation }: OrgActivityPanelProps) {
  return (
    <Card className="p-4 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Organization AI Activity</h2>
        <p className="text-xs text-muted-foreground">
          Across all practitioners in your organization
        </p>
      </div>

      <ActivityRow
        icon={MessageSquareText}
        title="AI Intake Sessions"
        breakdown={intake}
        statusMeta={INTAKE_STATUS_META}
      />

      <ActivityRow
        icon={Bot}
        title="AI Consultations"
        breakdown={consultation}
        statusMeta={CONSULTATION_STATUS_META}
      />
    </Card>
  );
}
