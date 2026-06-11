/**
 * ChatTopbar component.
 *
 * Layer: client / emr-chat / components
 *
 * Fixed topbar for the EMR chat page. Shows the session title (or "EMR Chat"),
 * a "New Chat" icon button, and a "History" icon button that opens the
 * SessionSidebar drawer.
 */

"use client";

import { SquarePen, Clock, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface ChatTopbarProps {
  /** Session title or null when a new blank chat is open. */
  title: string | null | undefined;
  /** Whether a workflow is currently in progress. */
  hasActiveWorkflow: boolean;
  /** Name of the active workflow, if any. */
  workflowName?: string;
  /** Called when the user clicks "New Chat". */
  onNewChat: () => void;
  /** Called when the user clicks the history icon. */
  onOpenHistory: () => void;
}

/**
 * Top bar displayed above the chat area with session context and navigation.
 *
 * @param title - Session title, or null for a new session.
 * @param hasActiveWorkflow - Whether to show the in-progress badge.
 * @param workflowName - Name of the running workflow for the badge tooltip.
 * @param onNewChat - Callback for the new chat button.
 * @param onOpenHistory - Callback for the history drawer button.
 */
export function ChatTopbar({
  title,
  hasActiveWorkflow,
  workflowName,
  onNewChat,
  onOpenHistory,
}: ChatTopbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
      {/* Brand mark */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Stethoscope className="size-4" />
      </div>

      {/* Session title */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-semibold truncate">
          {title ?? "EMR Chat"}
        </h1>
        {hasActiveWorkflow && workflowName && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {workflowName}
          </Badge>
        )}
      </div>

      {/* Actions */}
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
