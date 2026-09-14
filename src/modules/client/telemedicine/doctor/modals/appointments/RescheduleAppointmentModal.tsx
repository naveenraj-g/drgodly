/**
 * RescheduleAppointmentModal — dialog for rescheduling an appointment on the doctor portal.
 *
 * Layer: client / telemedicine / doctor / modals / appointments
 *
 * Opens when the doctor store's type === "rescheduleAppointment".
 * Mirrors the day-of-week-hinted date/slot picker from the patient booking
 * wizard's Step 2 (BookAppointment.tsx): the DateScroller dims any
 * day-of-week the practitioner never works (read straight off the resolved
 * PractitionerRole's own `availability` data — no fetch needed), and slots
 * are fetched one day at a time (`date=`, not a 30-day range) once a date is
 * picked — a single day never comes close to the API's 200-row page cap the
 * way a whole month's slots can, so this can't silently truncate the calendar.
 *
 * Data flow:
 *   1. Extract practitioner_id from appointment.participant.
 *   2. listPractitionerRolesAction({ practitioner_id }) → practitioner_role_id
 *      (its `availability` field also hints which days of the week to show).
 *   3. User picks a date → listSlotsAction({ practitioner_role_id, status: "free", date }).
 *   4. User picks a slot → rescheduleAppointmentAction({ id, new_slot_id }).
 *
 * Mounted once inside DoctorModalProvider. No props required.
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerActionQuery } from "@/lib/zsa-query";
import { rescheduleAppointmentAction } from "@/modules/server/presentation/actions/appointment";
import { listPractitionerRolesAction } from "@/modules/server/presentation/actions/practitioner-role";
import { listSlotsAction } from "@/modules/server/presentation/actions/slot";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { DateScroller } from "@/modules/client/telemedicine/patient/component/appointments/book/DateScroll";
import { useDoctorStore } from "../../stores/doctor.store";
import { doctorAppointmentKeys } from "../../component/appointments/list/appointmentQueries";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TSlotResponse } from "@/modules/entities/schemas/slot";
import type { TPractitionerRoleResponse } from "@/modules/entities/schemas/practitioner-role";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a slot's start datetime as a readable time string (e.g. "2:30 PM").
 *
 * @param slot - FHIR Slot response object.
 * @returns Formatted local time string, or empty string if start is absent.
 */
function getSlotTime(slot: TSlotResponse): string {
  if (!slot.start) return "";
  return new Date(slot.start).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Derives slot duration in minutes from start and end.
 *
 * @param slot - FHIR Slot response object.
 * @returns Duration in minutes, or null if either field is absent.
 */
function getSlotDuration(slot: TSlotResponse): number | null {
  if (!slot.start || !slot.end) return null;
  return Math.round(
    (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60_000,
  );
}

/**
 * Resolves the treating practitioner's display name from the participant array.
 *
 * @param appointment - FHIR Appointment response, may be null.
 * @returns Display name string, or "Doctor" fallback.
 */
function getDoctorName(appointment: TAppointmentResponse | null | undefined): string {
  return (
    appointment?.participant?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? "Doctor"
  );
}

/**
 * Resolves the treating practitioner's integer FHIR ID from the participant array.
 *
 * @param appointment - FHIR Appointment response, may be null.
 * @returns Practitioner integer ID, or null if not found.
 */
function getPractitionerId(
  appointment: TAppointmentResponse | null | undefined,
): number | null {
  return (
    appointment?.participant?.find((p) => p.reference_type === "Practitioner")
      ?.reference_id ?? null
  );
}

/** FHIR R4 DaysOfWeek codes, indexed to match JS Date.getDay() (0 = Sunday). */
const WEEKDAY_CODES = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

/**
 * Reads which days of the week a PractitionerRole has ANY declared available
 * time on — same helper as BookAppointment.tsx's Step 2. Straight off the
 * resolved role, no extra fetch needed.
 *
 * @param role - The resolved PractitionerRole for this appointment.
 * @returns Set of lowercase weekday codes (e.g. "mon"), or null if the role
 *   declares no availability data at all — callers should treat null as
 *   "don't restrict," not "restrict to nothing."
 */
function getRoleAvailableDaysOfWeek(
  role: TPractitionerRoleResponse,
): Set<string> | null {
  const days = new Set<string>();
  let hasAnyAvailableTime = false;
  role.availability?.forEach((block) => {
    block.available_times?.forEach((t) => {
      hasAnyAvailableTime = true;
      t.days_of_week?.forEach((d) => days.add(d.toLowerCase().slice(0, 3)));
    });
  });
  return hasAnyAvailableTime ? days : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Self-contained reschedule dialog.
 * Reads the target appointment from the doctor store — no external props needed.
 * Mounted once in DoctorModalProvider.
 */
export function RescheduleAppointmentModal() {
  const isOpen = useDoctorStore((s) => s.isOpen);
  const type = useDoctorStore((s) => s.type);
  const data = useDoctorStore((s) => s.data);
  const onClose = useDoctorStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only active when this specific modal type is set. */
  const open = isOpen && type === "rescheduleAppointment";
  const appointment = data?.appointment;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TSlotResponse | null>(null);

  // "Now", as state rather than a bare Date.now() call in render — refreshed
  // every minute so a slot rolls off the list on its own if this dialog is
  // left open past its start time, instead of only re-checking on the next render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reset selections each time the modal opens so stale state doesn't carry over.
  useEffect(() => {
    if (open) {
      setSelectedDate(null);
      setSelectedSlot(null);
    }
  }, [open]);

  const calendarDates = useMemo<Date[]>(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const practitionerId = open ? getPractitionerId(appointment) : null;

  // ── Step 1: resolve PractitionerRole from Practitioner integer ID ─────────────
  const { data: rolesData, isLoading: isLoadingRole } = useServerActionQuery(
    listPractitionerRolesAction,
    {
      input: { payload: { practitioner_id: practitionerId ?? 0, limit: 1 } },
      queryKey: ["reschedule-role", practitionerId],
      enabled: !!practitionerId && open,
    },
  );

  const practitionerRole = rolesData?.data[0] ?? null;
  const practitionerRoleId = practitionerRole?.id ?? null;

  // ── Derived: which calendar dates to show as enabled ────────────────────────
  // Dims any day-of-week the resolved role never declares available time on
  // (data already on the role, no fetch needed) — a hint, not a guarantee; a
  // date can still turn out empty once its slots are fetched, which the
  // time-grid's own empty state handles. Null availability data (role not
  // resolved yet, or declares none) leaves every date enabled.
  const availableDateStrings = useMemo<Set<string> | undefined>(() => {
    if (!practitionerRole) return undefined;
    const allowedDays = getRoleAvailableDaysOfWeek(practitionerRole);
    if (allowedDays === null) return undefined;
    const s = new Set<string>();
    calendarDates.forEach((d) => {
      if (allowedDays.has(WEEKDAY_CODES[d.getDay()])) {
        s.add(d.toISOString().slice(0, 10));
      }
    });
    return s;
  }, [practitionerRole, calendarDates]);

  // ── Step 2: fetch free slots for the selected date only ───────────────────────
  // One day at a time, not a 30-day range — a single day's slots never come
  // close to the API's 200-row page cap the way a whole month's can, so this
  // can't silently truncate the calendar the way the old eager range-fetch did.
  const selectedDateStr = useMemo(
    () => selectedDate?.toISOString().slice(0, 10) ?? null,
    [selectedDate],
  );

  const { data: slotsData, isLoading: isLoadingSlots } = useServerActionQuery(
    listSlotsAction,
    {
      input: {
        payload: {
          practitioner_role_id: practitionerRoleId ?? 0,
          status: "free",
          date: selectedDateStr ?? undefined,
          limit: 200,
        },
      },
      queryKey: ["reschedule-slots", practitionerRoleId, selectedDateStr],
      enabled: !!practitionerRoleId && !!selectedDateStr,
    },
  );

  const slotsForSelectedDate = useMemo<TSlotResponse[]>(
    () => slotsData?.data ?? [],
    [slotsData],
  );

  // ── Derived: slots for the currently selected date ────────────────────────────
  // Already scoped server-side to selectedDateStr — this just drops any slot
  // whose start has already passed and sorts.
  const slotsForDate = useMemo<TSlotResponse[]>(() => {
    if (!selectedDate) return [];
    return slotsForSelectedDate
      .filter((sl) => sl.start && new Date(sl.start).getTime() > now)
      .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  }, [slotsForSelectedDate, selectedDate, now]);

  // ── Submit ────────────────────────────────────────────────────────────────────
  const { execute, isPending } = useServerAction(rescheduleAppointmentAction, {
    onSuccess: () => {
      toast.success("Appointment rescheduled successfully");
      // Refresh the appointment table so the updated time is visible.
      void queryClient.invalidateQueries({ queryKey: doctorAppointmentKeys.all });
      // Bust slot cache — the old slot is now free and the new one is busy;
      // stale "free" data would show the booked slot again on next open.
      void queryClient.invalidateQueries({ queryKey: ["reschedule-slots"] });
      void queryClient.invalidateQueries({ queryKey: ["reschedule-role"] });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to reschedule appointment" });
    },
  });

  /**
   * Fires the reschedule action with the selected slot ID.
   * Backend atomically frees old slot, updates appointment timing, marks new slot busy.
   */
  async function handleReschedule() {
    if (!appointment?.id || !selectedSlot?.id) return;
    await execute({
      payload: {
        id: appointment.id,
        new_slot_id: selectedSlot.id,
      },
    });
  }

  const doctorName = getDoctorName(appointment);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Pick a new date and time for this appointment
          </DialogDescription>
        </DialogHeader>

        {/* Doctor badge */}
        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-muted/40 w-fit">
          <span className="text-muted-foreground text-sm">Appointment with</span>
          <Avatar className="h-6 w-6">
            <AvatarFallback>{doctorName[0]}</AvatarFallback>
          </Avatar>
          <span className="text-foreground text-sm font-semibold">{doctorName}</span>
        </div>

        {/* Loading skeleton — while the PractitionerRole is still resolving.
            Mirrors the DateScroller + slot grid layout so the swap-in is seamless. */}
        {isLoadingRole ? (
          <Card className="space-y-6 p-4">
            {/* Date scroller skeleton */}
            <div>
              <Skeleton className="h-4 w-32 mb-4 rounded" />
              <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-12 rounded-lg shrink-0" />
                ))}
              </div>
            </div>
            {/* Time slot grid skeleton */}
            <div>
              <Skeleton className="h-4 w-28 mb-4 rounded" />
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="space-y-6 p-4">
            {/* Date Scroller */}
            <div>
              <h3 className="font-semibold text-muted-foreground text-sm mb-4">
                Available Dates{selectedDate ? ` (${selectedDate.toDateString()})` : ""}
              </h3>
              <DateScroller
                dates={calendarDates}
                selectedDate={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                availableDates={availableDateStrings}
              />
            </div>

            {/* Time slot grid */}
            <div>
              <h3 className="font-semibold text-muted-foreground text-sm mb-4">
                Available Times
              </h3>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground py-4">
                  Pick a date above to see available times.
                </p>
              ) : isLoadingSlots ? (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : slotsForDate.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No available slots for this day. Please pick another date.
                </p>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {slotsForDate.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const time = getSlotTime(slot);
                    const duration = getSlotDuration(slot);
                    return (
                      <Button
                        key={slot.id}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setSelectedSlot(slot)}
                        className="flex flex-col items-center gap-0.5 h-auto py-2"
                      >
                        <span className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                        {duration && (
                          <span className="text-[10px] opacity-70">{duration} min</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Close
            </Button>
          </DialogClose>
          <Button
            disabled={isPending || !selectedDate || !selectedSlot}
            onClick={handleReschedule}
          >
            {isPending && <Loader2 className="animate-spin mr-1 h-4 w-4" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
