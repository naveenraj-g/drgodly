/**
 * @file AppointmentDetailActions.tsx
 * @description "View previous visit" / Confirm / Reschedule / Cancel button
 * group for the doctor dashboard's selected-appointment detail panel.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Confirm/Reschedule/Cancel render as standalone, status-tinted buttons on
 * wide-enough screens; below a width threshold they collapse into a single
 * "…" dropdown instead, since three full buttons don't fit.
 *
 * That threshold isn't a fixed Tailwind breakpoint — it depends on whether
 * the app sidebar is open, since an open sidebar eats into the same
 * horizontal space this panel has to work with:
 *   - Sidebar open   → collapse at ≤1120px viewport width
 *   - Sidebar closed → collapse at ≤910px viewport width
 *
 * This lives in its own component (rather than inline in DoctorDashboard) so
 * that reading the sidebar's open/closed state via useSidebar() only
 * re-renders this small button group when the sidebar is toggled, not the
 * whole dashboard (appointment list, insight cards, etc.).
 */

"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  History,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { doctorStore } from "@/modules/client/telemedicine/doctor/stores/doctor.store";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Compact-mode breakpoints ──────────────────────────────────────────────────

/** Collapse to the dropdown at or below this width while the sidebar is open. */
const COMPACT_WIDTH_SIDEBAR_OPEN = 1120;
/** Collapse to the dropdown at or below this width while the sidebar is closed. */
const COMPACT_WIDTH_SIDEBAR_CLOSED = 910;

// ── Props ─────────────────────────────────────────────────────────────────────

interface AppointmentDetailActionsProps {
  /** The appointment these actions apply to (null disables all mutation actions). */
  selectedAppointment: TAppointmentResponse | null;
  /** Whether the appointment is pending — enables Confirm. */
  canConfirm: boolean;
  /** Whether the appointment can be rescheduled (booked/pending with a slot). */
  canReschedule: boolean;
  /** Whether the appointment can be cancelled (booked or pending). */
  canCancel: boolean;
  /** Opens the previous-visit dialog. */
  onViewPreviousVisit: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders "View previous visit" plus Confirm/Reschedule/Cancel, switching
 * the latter three between standalone buttons and a dropdown based on
 * available width and sidebar state.
 */
export function AppointmentDetailActions({
  selectedAppointment,
  canConfirm,
  canReschedule,
  canCancel,
  onViewPreviousVisit,
}: AppointmentDetailActionsProps) {
  const { open: sidebarOpen } = useSidebar();
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const threshold = sidebarOpen
      ? COMPACT_WIDTH_SIDEBAR_OPEN
      : COMPACT_WIDTH_SIDEBAR_CLOSED;
    const evaluate = () => setIsCompact(window.innerWidth <= threshold);
    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, [sidebarOpen]);

  const hasMenuActions = canConfirm || canReschedule || canCancel;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onViewPreviousVisit}
      >
        <History className="size-3.5" />
        View previous visit
      </Button>

      {/* Standalone buttons — tinted with the theme-aware success/info/destructive
          tokens (not raw Tailwind green-100/blue-100/red-100) so they stay
          readable on a dark background instead of showing as pale light-mode
          swatches. Each also sets its own hover:text-* explicitly: the
          "outline" Button variant's base styles include hover:text-foreground,
          which would otherwise win on hover and turn the label/icon white. */}
      {!isCompact && canConfirm && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-success/30 bg-success/10 text-success hover:bg-success/20 hover:text-success dark:bg-success/20 dark:hover:bg-success/30"
          onClick={() =>
            selectedAppointment &&
            doctorStore.getState().onOpen({
              type: "confirmAppointment",
              data: { appointment: selectedAppointment },
            })
          }
        >
          <CheckCircle2 className="size-3.5" />
          Confirm
        </Button>
      )}
      {!isCompact && canReschedule && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-info/30 bg-info/10 text-info hover:bg-info/20 hover:text-info dark:bg-info/20 dark:hover:bg-info/30"
          onClick={() =>
            selectedAppointment &&
            doctorStore.getState().onOpen({
              type: "rescheduleAppointment",
              data: { appointment: selectedAppointment },
            })
          }
        >
          <CalendarClock className="size-3.5" />
          Reschedule
        </Button>
      )}
      {!isCompact && canCancel && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive dark:bg-destructive/20 dark:hover:bg-destructive/30"
          onClick={() =>
            selectedAppointment &&
            doctorStore.getState().onOpen({
              type: "cancelAppointment",
              data: { appointment: selectedAppointment },
            })
          }
        >
          <XCircle className="size-3.5" />
          Cancel
        </Button>
      )}

      {/* Compact fallback — same three actions as a dropdown. */}
      {isCompact && hasMenuActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Open appointment actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {canConfirm && (
              <DropdownMenuItem
                className="gap-2 text-sm"
                onClick={() =>
                  selectedAppointment &&
                  doctorStore.getState().onOpen({
                    type: "confirmAppointment",
                    data: { appointment: selectedAppointment },
                  })
                }
              >
                <CheckCircle2 className="size-3.5 text-muted-foreground" />
                Confirm
              </DropdownMenuItem>
            )}
            {canReschedule && (
              <DropdownMenuItem
                className="gap-2 text-sm"
                onClick={() =>
                  selectedAppointment &&
                  doctorStore.getState().onOpen({
                    type: "rescheduleAppointment",
                    data: { appointment: selectedAppointment },
                  })
                }
              >
                <CalendarClock className="size-3.5 text-muted-foreground" />
                Reschedule
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem
                className="gap-2 text-sm text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() =>
                  selectedAppointment &&
                  doctorStore.getState().onOpen({
                    type: "cancelAppointment",
                    data: { appointment: selectedAppointment },
                  })
                }
              >
                <XCircle className="size-3.5 text-destructive" />
                Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
