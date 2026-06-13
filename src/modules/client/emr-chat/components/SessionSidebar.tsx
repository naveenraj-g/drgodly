/**
 * SessionSidebar component.
 *
 * Layer: client / emr-chat / components
 *
 * History drawer that lists all ACTIVE chat sessions grouped by recency
 * (Today / Yesterday / This Week / Older). Slides in from the right as a
 * Sheet overlay. Supports session selection and soft-deletion (archive).
 */

"use client";

import { useMemo } from "react";
import { MessageSquare, Trash2, Clock, SquarePen } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TEmrChatSessionSummary } from "@/modules/entities/schemas/emr-chat";

interface SessionGroup {
  label: string;
  sessions: TEmrChatSessionSummary[];
}

/**
 * Groups sessions into recency buckets for the sidebar list.
 *
 * @param sessions - All session summaries.
 * @param now - Current date reference (allows deterministic tests).
 * @returns Array of labelled groups in reverse-chronological order.
 */
function groupSessionsByRecency(
  sessions: TEmrChatSessionSummary[],
  now: Date,
): SessionGroup[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: SessionGroup[] = [
    { label: "Today", sessions: [] },
    { label: "Yesterday", sessions: [] },
    { label: "This Week", sessions: [] },
    { label: "Older", sessions: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.updatedAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (day.getTime() >= today.getTime()) {
      groups[0].sessions.push(s);
    } else if (day.getTime() >= yesterday.getTime()) {
      groups[1].sessions.push(s);
    } else if (day.getTime() >= weekAgo.getTime()) {
      groups[2].sessions.push(s);
    } else {
      groups[3].sessions.push(s);
    }
  }

  return groups.filter((g) => g.sessions.length > 0);
}

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: TEmrChatSessionSummary[];
  activeSessionId: string | null;
  isLoading: boolean;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
}

/**
 * Slide-in drawer showing the session history grouped by recency.
 * Each row has a click-to-open and a delete button.
 *
 * @param isOpen - Whether the Sheet is visible.
 * @param onClose - Called when the user dismisses the drawer.
 * @param sessions - Flat list of session summaries.
 * @param activeSessionId - UUID of the currently open session.
 * @param isLoading - Whether to show skeleton rows.
 * @param onSelectSession - Called with the session UUID when a row is clicked.
 * @param onDeleteSession - Called with the session UUID when delete is clicked.
 * @param onNewChat - Called when the "New Chat" button is clicked.
 */
export function SessionSidebar({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  isLoading,
  onSelectSession,
  onDeleteSession,
  onNewChat,
}: SessionSidebarProps) {
  const groups = useMemo(
    () => groupSessionsByRecency(sessions, new Date()),
    [sessions],
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-5 pb-3 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-muted-foreground" />
            Chat History
          </SheetTitle>
        </SheetHeader>

        {/* New Chat button inside drawer */}
        <div className="px-4 pb-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => {
              onNewChat();
              onClose();
            }}
          >
            <SquarePen className="size-4" />
            New Chat
          </Button>
        </div>

        <Separator className="shrink-0" />

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="flex flex-col gap-2 px-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
              <MessageSquare className="size-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No previous chats</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        isActive={session.id === activeSessionId}
                        onSelect={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                        onDelete={() => onDeleteSession(session.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface SessionRowProps {
  session: TEmrChatSessionSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

/**
 * A single session row in the sidebar list.
 * Shows title (or "New Chat"), message count, and active workflow badge.
 */
function SessionRow({ session, isActive, onSelect, onDelete }: SessionRowProps) {
  const displayTitle = session.title ?? "New Chat";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 text-foreground",
      )}
    >
      <MessageSquare className="size-4 shrink-0 text-muted-foreground" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayTitle}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {session.messageCount} {session.messageCount === 1 ? "msg" : "msgs"}
          </span>
          {session.hasActiveWorkflow && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
              Resumable
            </Badge>
          )}
        </div>
      </div>

      {/* Delete button — shown on hover */}
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete session"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
