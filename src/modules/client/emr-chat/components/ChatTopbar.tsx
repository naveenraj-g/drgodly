/**
 * ChatTopbar component.
 *
 * Layer: client / emr-chat / components
 *
 * Fixed topbar for the EMR chat page. Shows the session title (or the
 * container's default label — "EMR Chat" / "EMR Analysis"), an inline tab
 * toggle (Chat / Workflows), and icon buttons for New Chat and Chat History.
 *
 * The "UI Schemas" tab (live preview of every A2UI schema in the registry) is
 * deliberately not listed in TABS below, so it can't be reached from this UI —
 * but the view value ("schemas") and its panel in EMRChatContainer.tsx are
 * left fully intact. Add the entry back to TABS to re-expose it; nothing else
 * needs to change.
 *
 * Layout:  [icon + title + badge]  ·  [tab pills]  ·  [new-chat] [history]
 */

"use client";

import { SquarePen, Clock, Stethoscope, MessageSquare, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** The three panels available in the EMR chat container. */
export type EmrChatView = "chat" | "workflows" | "schemas";

interface ChatTopbarProps {
  /** Session title or null when a new blank chat is open. */
  title: string | null | undefined;
  /**
   * Shown in place of the title when no session title is set — "EMR Chat"
   * for the general-purpose chat surfaces, "EMR Analysis" for read-only
   * dashboard-style surfaces like Patient Chart Review. Defaults to "EMR Chat".
   */
  defaultTitle?: string;
  /** Whether a workflow is currently in progress. */
  hasActiveWorkflow: boolean;
  /** Name of the active workflow, if any. */
  workflowName?: string;
  /** Currently active panel. */
  view: EmrChatView;
  /** Called when the user clicks a tab button. */
  onViewChange: (view: EmrChatView) => void;
  /** Called when the user clicks "New Chat". */
  onNewChat: () => void;
  /** Called when the user clicks the history icon. */
  onOpenHistory: () => void;
}

/**
 * Tab definitions — icon, label, and view key.
 * "schemas" (UI Schemas) is deliberately omitted — see the file header.
 */
const TABS: { view: EmrChatView; icon: React.ReactNode; label: string }[] = [
  { view: "chat", icon: <MessageSquare className="size-3" />, label: "Chat" },
  { view: "workflows", icon: <Layers className="size-3" />, label: "Workflows" },
];

/**
 * Top bar for the EMR chat page with an inline panel-switching tab toggle.
 *
 * @param props.title              - Session title, or null for a new session.
 * @param props.defaultTitle       - Fallback label when no session title is set.
 * @param props.hasActiveWorkflow  - Whether to show the in-progress badge.
 * @param props.workflowName       - Name of the running workflow for the badge.
 * @param props.view               - Currently active panel.
 * @param props.onViewChange       - Fired when the user selects a tab.
 * @param props.onNewChat          - Callback for the new-chat icon button.
 * @param props.onOpenHistory      - Callback for the history icon button.
 */
export function ChatTopbar({
  title,
  defaultTitle = "EMR Chat",
  hasActiveWorkflow,
  workflowName,
  view,
  onViewChange,
  onNewChat,
  onOpenHistory,
}: ChatTopbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background shrink-0">
      {/* Brand icon */}
      <div className="flex items-center text-muted-foreground shrink-0">
        <Stethoscope className="size-4" />
      </div>

      {/* Session title + active workflow badge */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <h1 className="text-sm font-semibold truncate max-w-[160px]">
          {title ?? defaultTitle}
        </h1>
        {hasActiveWorkflow && workflowName && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {workflowName}
          </Badge>
        )}
      </div>

      {/* Tab toggle — centred in remaining space */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.view}
              onClick={() => onViewChange(tab.view)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors whitespace-nowrap",
                view === tab.view
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={onNewChat}>
              <SquarePen className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={onOpenHistory}>
              <Clock className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Chat history</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
