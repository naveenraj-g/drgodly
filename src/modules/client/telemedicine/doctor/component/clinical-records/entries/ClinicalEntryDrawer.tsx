/**
 * ClinicalEntryDrawer — side drawer hosting one clinical entry's full field set.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * Thin shell around the shadcn Sheet: header, scrollable body, and a footer with
 * Remove and Done. The resource-specific field groups are passed as children so
 * this stays agnostic of which entry type it is showing.
 *
 * Edits inside the drawer are applied immediately to the parent list (no local
 * buffer, no explicit save) — that keeps the workspace's single staging
 * autosave as the only place work is persisted. "Done" just closes the panel.
 */

"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClinicalEntryDrawerProps {
  /** Whether the drawer is showing. */
  open: boolean;
  /** Entry name for the header — falls back to the section title. */
  title: string;
  /** Whether the entry already exists in the EMR (changes the removal warning). */
  isPublished?: boolean;
  /** Closes the drawer. */
  onClose: () => void;
  /** Removes the entry; omitted when there is no entry open. */
  onRemove?: () => void;
  /** Resource-specific field groups. */
  children: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Detail drawer for a single clinical entry.
 *
 * @param props - See ClinicalEntryDrawerProps.
 */
export function ClinicalEntryDrawer({
  open,
  title,
  isPublished = false,
  onClose,
  onRemove,
  children,
}: ClinicalEntryDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        resizable
        maxWidth={860}
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b">
          <SheetTitle className="truncate">
            {title.trim().length > 0 ? title : "Untitled entry"}
          </SheetTitle>
          <SheetDescription>
            {isPublished
              ? "Already in the EMR — changes are applied when you publish."
              : "Not yet in the EMR — publish to save it to the patient record."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-4">{children}</div>
        </ScrollArea>

        <SheetFooter className="flex-row items-center justify-between border-t">
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : (
            <span />
          )}

          <Button type="button" size="sm" onClick={onClose}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
