/**
 * @file BottomActionBar.tsx
 * @description Bottom action row on the oc-demo page — SOAP note / EMR /
 * summary / follow-up / more-actions buttons. All actions are placeholders
 * (this page has no real consultation record to act on).
 * @layer client/telemedicine/doctor/component/oc-demo
 */

"use client";

import {
  CalendarPlus,
  ClipboardList,
  Database,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PLACEHOLDER_MESSAGE = "This action is a placeholder in this design prototype.";

/** Renders the bottom row of visit actions. */
export function BottomActionBar() {
  const onPlaceholder = () => toast.info(PLACEHOLDER_MESSAGE);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onPlaceholder}>
        <ClipboardList className="size-3.5" />
        Generate SOAP Note
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onPlaceholder}>
        <Database className="size-3.5" />
        Add to EMR
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onPlaceholder}>
        <Send className="size-3.5" />
        Share Summary with Patient
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onPlaceholder}>
        <CalendarPlus className="size-3.5" />
        Schedule Follow-up
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5 ml-auto" onClick={onPlaceholder}>
        <MoreHorizontal className="size-3.5" />
        More Actions
      </Button>
    </div>
  );
}
