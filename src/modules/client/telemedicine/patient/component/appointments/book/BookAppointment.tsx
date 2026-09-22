/**
 * BookAppointment — 3-step appointment booking wizard.
 *
 * Layer: client / telemedicine / patient / appointments / book
 *
 * Step 1 — Select Practitioner
 *   Fetches all active PractitionerRoles (booking-enriched) from FHIR on mount.
 *   Allows filtering by name/specialty. User picks a role → practitioner_role_id
 *   and practitioner_id are locked in.
 *
 * Step 2 — Choose Date & Slot
 *   Two-column layout: a shadcn Calendar (month view, single-date pick) on
 *   the left, available times on the right. The Calendar's disabled matcher
 *   restricts picks to the next 30 days and dims any day-of-week the selected
 *   PractitionerRole never works (from its own availability data — no fetch
 *   needed). Slots are fetched one day at a time, only once a date is picked
 *   (`date=` query, not a range) — a single day never comes close to the
 *   API's 200-row page cap the way a whole month's slots can, so this can't
 *   silently truncate the way an eager 30-day fetch did.
 *   User picks a date → time buttons appear → user picks a slot → slot_id locked.
 *
 * Step 3 — Confirm
 *   Shows a summary card. On confirm, calls bookAppointmentAction with
 *   { practitioner_id, slot_id, patient_id }. Success opens a dialog.
 *   The appointment type is normally inherited from the slot by fhir-gql; this
 *   step supplies ROUTINE only when the slot declares none, since the type
 *   cannot be patched in after creation.
 *
 * Data ownership:
 *   patientFhirId — passed from server (getPatientMeAction in page.tsx)
 *   practitioner_id — role.practitioner_ref_id from FHIR
 *   slot_id — selectedSlot.id from FHIR
 */

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Calendar,
  Clock,
  ChevronLeft,
  Filter,
  Loader2,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StepIndicator } from "./StepIndicator";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import {
  PractitionerCard,
  getPractitionerName,
  getPractitionerSpecialty,
} from "./PractitionerCard";
import { listPractitionerRolesForBookingAction } from "@/modules/server/presentation/actions/practitioner-role";
import { listSlotsAction } from "@/modules/server/presentation/actions/slot";
import { bookAppointmentAction } from "@/modules/server/presentation/actions/appointment";
import { linkIntakeToAppointmentAction } from "@/modules/server/presentation/actions/intake";
import { createConsultationAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import type { TPractitionerRoleBookingResponse } from "@/modules/entities/schemas/practitioner-role";
import type { TSlotResponse } from "@/modules/entities/schemas/slot";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  getProfileInitials,
  formatApiDate,
  formatDisplayDate,
  formatDisplayTime,
} from "@/modules/shared/helper";
import { useServerActionQuery } from "@/lib/zsa-query";
import { patientAppointmentKeys } from "../list/appointmentQueries";

// ── Prop types ────────────────────────────────────────────────────────────────

/** Props passed from the BookAppointmentPage server component. */
interface BookAppointmentProps {
  /** FHIR integer ID of the authenticated patient (from getPatientMeAction). */
  patientFhirId: number;
  /**
   * Human-readable display name of the patient (derived server-side from name[0]).
   * Sent as `patient_display` in the booking payload so the backend stores it as
   * the Patient participant's reference_display — no separate fetch needed on read.
   */
  patientDisplayName?: string;
  /** drgodly string userId from session (for org context). */
  userId: string;
  /** Active organisation ID from session. */
  orgId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Fallback appointment type, used only when the booked slot declares none.
 *
 * ROUTINE is the value set's own documented default ("Routine appointment —
 * default if not valued"), and it is the only code in v2-0276 that honestly
 * describes a self-service booking made up to 30 days ahead: WALKIN is by
 * definition unscheduled, EMERGENCY is a triage decision rather than something
 * a patient should be able to self-assign, and CHECKUP/FOLLOWUP are claims
 * about the visit that only the patient or practitioner can make.
 *
 * Needed because the fhir-server cannot patch appointmentType after creation —
 * booking is the only chance to set it.
 */
const DEFAULT_APPOINTMENT_TYPE = {
  appointment_type_system: "http://terminology.hl7.org/CodeSystem/v2-0276",
  appointment_type_code: "ROUTINE",
  appointment_type_display: "Routine appointment",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a slot's start datetime as a readable time string (e.g. "2:30 PM").
 *
 * @param slot - FHIR Slot response object.
 * @returns Formatted time string or empty string if start is absent.
 */
function getSlotTime(slot: TSlotResponse): string {
  if (!slot.start) return "";
  return formatDisplayTime(slot.start);
}

/**
 * Derives the duration in minutes from a slot's start and end datetimes.
 *
 * @param slot - FHIR Slot response object.
 * @returns Duration in minutes or null if either field is absent.
 */
function getSlotDuration(slot: TSlotResponse): number | null {
  if (!slot.start || !slot.end) return null;
  return Math.round(
    (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60_000,
  );
}

/**
 * Formats a Date as a long-form string (e.g. "Wednesday, June 15, 2026").
 *
 * @param date - Date to format.
 * @returns Formatted date string.
 */
function formatFullDate(date: Date): string {
  return formatDisplayDate(date);
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
 * time on, straight off the booking-search response — no extra fetch needed.
 *
 * @param role - Selected practitioner role (booking-enriched).
 * @returns Set of lowercase weekday codes (e.g. "mon"), or null if the role
 *   declares no availability data at all — callers should treat null as
 *   "don't restrict," not "restrict to nothing," since absent data isn't the
 *   same claim as an empty schedule.
 */
function getRoleAvailableDaysOfWeek(
  role: TPractitionerRoleBookingResponse,
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
 * 3-step appointment booking wizard.
 * Fetches FHIR data client-side via ZSA server actions.
 *
 * @param patientFhirId - FHIR integer patient ID (from session-guarded page).
 * @param userId - drgodly string user ID.
 * @param orgId - Active organisation ID.
 */
export function BookAppointment({
  patientFhirId,
  patientDisplayName,
  userId,
  orgId,
}: BookAppointmentProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1: practitioner list ───────────────────────────────────────────────
  const [selectedRole, setSelectedRole] =
    useState<TPractitionerRoleBookingResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");

  // ── Step 2: slot list ───────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TSlotResponse | null>(null);

  // "Now", as state rather than a bare Date.now() call in render — refreshed
  // every minute so a slot rolls off the list on its own if this page is left
  // open past its start time, instead of only re-checking on the next render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Step 3: booking ─────────────────────────────────────────────────────────
  const [isBooking, setIsBooking] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // ── Fetch practitioner roles (TanStack Query) ───────────────────────────────
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    isError: isRolesError,
  } = useServerActionQuery(listPractitionerRolesForBookingAction, {
    input: { payload: { active: true, limit: 100, org_id: orgId } },
    queryKey: ["practitioner-roles-booking", orgId],
  });

  const roles = useMemo<TPractitionerRoleBookingResponse[]>(
    () => rolesData?.data ?? [],
    [rolesData],
  );

  // Show error toast when practitioner fetch fails
  if (isRolesError) {
    toast.error("Failed to load practitioners. Please try again.");
  }

  // ── Fetch free slots for the selected date (TanStack Query) ──────────────────
  // One day at a time, not a 30-day range — a single day's slots never come
  // close to the API's 200-row page cap the way a whole month's can, so this
  // can't silently truncate the calendar the way the old eager range-fetch did.
  const selectedDateStr = useMemo(
    () => (selectedDate ? formatApiDate(selectedDate) : null),
    [selectedDate],
  );

  const {
    data: slotsData,
    isLoading: isLoadingSlots,
    isError: isSlotsError,
  } = useServerActionQuery(listSlotsAction, {
    input: {
      payload: {
        practitioner_role_id: selectedRole?.id ?? 0,
        status: "free",
        date: selectedDateStr ?? undefined,
        limit: 200,
      },
    },
    queryKey: ["slots-free", selectedRole?.id, selectedDateStr],
    enabled: !!selectedRole && !!selectedDateStr,
  });

  const slotsForSelectedDate = useMemo<TSlotResponse[]>(
    () => slotsData?.data ?? [],
    [slotsData],
  );

  // Show error toast when slots fetch fails
  if (isSlotsError) {
    toast.error("Failed to load available slots. Please try again.");
  }

  // ── Derived: unique specialty labels for the filter dropdown ────────────────
  const specialties = useMemo<string[]>(() => {
    const s = new Set<string>();
    roles.forEach((r) => {
      const spec = getPractitionerSpecialty(r);
      if (spec) s.add(spec);
    });
    return ["All", ...Array.from(s).sort()];
  }, [roles]);

  // ── Derived: filtered practitioner list ─────────────────────────────────────
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const name = getPractitionerName(r).toLowerCase();
      const spec = getPractitionerSpecialty(r).toLowerCase();
      const matchesSearch =
        name.includes(searchQuery.toLowerCase()) ||
        spec.includes(searchQuery.toLowerCase());
      const matchesSpecialty =
        selectedSpecialty === "All" ||
        getPractitionerSpecialty(r) === selectedSpecialty;
      return matchesSearch && matchesSpecialty;
    });
  }, [roles, searchQuery, selectedSpecialty]);

  // ── Derived: rolling 30-day calendar for the DateScroller ──────────────────
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

  // ── Derived: which calendar dates to show as enabled ────────────────────────
  // Dims any day-of-week the selected role never declares available time on
  // (data already on the role, no fetch needed) — this is a hint, not a
  // guarantee; a date can still turn out empty once its slots are fetched,
  // which the time-grid's own empty state handles. If the role has no
  // availability data at all, every date stays enabled rather than none.
  const availableDateStrings = useMemo<Set<string> | undefined>(() => {
    if (!selectedRole) return undefined;
    const allowedDays = getRoleAvailableDaysOfWeek(selectedRole);
    if (allowedDays === null) return undefined;
    const s = new Set<string>();
    calendarDates.forEach((d) => {
      if (allowedDays.has(WEEKDAY_CODES[d.getDay()])) {
        s.add(formatApiDate(d));
      }
    });
    return s;
  }, [selectedRole, calendarDates]);

  // ── Derived: set of the 30 bookable ISO dates, for the Calendar's disabled matcher ──
  const calendarDateStrings = useMemo<Set<string>>(
    () => new Set(calendarDates.map((d) => formatApiDate(d))),
    [calendarDates],
  );

  /**
   * Disables any date outside the 30-day booking window, or (when the role's
   * availability data narrows it further) a day-of-week the role never works.
   * Mirrors DateScroller's own disabled logic, just as a matcher fn for the
   * shadcn Calendar instead of a per-button boolean.
   *
   * Uses formatApiDate (IST-pinned local date components), not
   * `toISOString()` — the Calendar widget hands this matcher local-midnight
   * Date objects for each grid cell, and `toISOString()` converts to UTC
   * first. In any positive-UTC-offset timezone (e.g. IST) that silently
   * rolls every date back by one day, which made today's cell fail the
   * lookup and show as disabled.
   */
  const isDayDisabled = useCallback(
    (date: Date) => {
      const iso = formatApiDate(date);
      if (!calendarDateStrings.has(iso)) return true;
      if (availableDateStrings && !availableDateStrings.has(iso)) return true;
      return false;
    },
    [calendarDateStrings, availableDateStrings],
  );

  // ── Derived: slots for the currently selected date ──────────────────────────
  // Already scoped server-side to selectedDateStr — this just drops any slot
  // whose start has already passed (a no-op for future dates, but keeps
  // today's list from offering times earlier than right now) and sorts.
  const slotsForDate = useMemo<TSlotResponse[]>(() => {
    if (!selectedDate) return [];
    return slotsForSelectedDate
      .filter((sl) => sl.start && new Date(sl.start).getTime() > now)
      .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  }, [slotsForSelectedDate, selectedDate, now]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Advances from step 1 → 2. */
  const handleNextStep = useCallback(() => {
    if (step === 1 && selectedRole) setStep(2);
    else if (step === 2 && selectedDate && selectedSlot) setStep(3);
  }, [step, selectedRole, selectedDate, selectedSlot]);

  /**
   * Goes back one step. Leaving step 2 (date/time selection) back to step 1
   * clears the picked date/slot — otherwise re-advancing without changing
   * practitioner would land back on step 2 with a stale date/time still
   * selected, since only picking a practitioner (not this button) resets them.
   */
  const handlePrevStep = useCallback(() => {
    if (step === 2) {
      setSelectedDate(null);
      setSelectedSlot(null);
    }
    if (step > 1) setStep(step - 1);
  }, [step]);

  /**
   * Submits the booking via bookAppointmentAction.
   * Uses practitioner_ref_id (the Practitioner FK) as practitioner_id.
   */
  const handleConfirmBooking = useCallback(async () => {
    if (!selectedRole || !selectedSlot) {
      toast.error("Please complete all steps before confirming.");
      return;
    }

    const practitionerId = selectedRole.practitioner_ref_id;
    if (!practitionerId) {
      toast.error("Practitioner reference not found. Please try again.");
      return;
    }

    // selectedRole is already guarded non-null above.
    const practitionerName = getPractitionerName(selectedRole);

    setIsBooking(true);
    const [bookedAppointment, err] = await bookAppointmentAction({
      payload: {
        practitioner_id: practitionerId,
        slot_id: selectedSlot.id,
        patient_id: patientFhirId,
        user_id: userId,
        org_id: orgId,
        /* Display names stored as participant reference_display so they are
           available on read without a secondary Practitioner/Patient fetch. */
        practitioner_display: practitionerName || undefined,
        patient_display: patientDisplayName || undefined,
        /* Appointment type is a floor, not an override. fhir-gql already copies
           the slot's own type onto the appointment, and it treats a supplied
           code as a wholesale replacement — so sending ROUTINE unconditionally
           would clobber a session the practitioner generated as a dedicated
           CHECKUP or FOLLOWUP. Only fill the gap when the slot declares nothing.
           Mirrors the same code-or-text check the booking service applies. */
        ...(selectedSlot.appointment_type_code ||
        selectedSlot.appointment_type_text
          ? {}
          : DEFAULT_APPOINTMENT_TYPE),
      },
    });
    setIsBooking(false);

    if (err) {
      toast.error(
        err.code === "CONFLICT"
          ? "That slot was just taken. Please choose another time."
          : (err.message ?? "Failed to book appointment. Please try again."),
      );
      return;
    }

    // Stale cached list would otherwise still be "fresh" (staleTime) when the
    // patient lands back on the appointments page, hiding the new booking.
    void queryClient.invalidateQueries({
      queryKey: patientAppointmentKeys.all,
    });

    // The just-booked slot is now taken server-side, but the free-slots query
    // (keyed by this practitioner role) has its own staleTime and would keep
    // showing it as available — e.g. if the patient books a second slot for
    // the same doctor without leaving this page. Invalidate so Step 2 refetches.
    void queryClient.invalidateQueries({
      queryKey: ["slots-free", selectedRole.id],
    });

    // Link the pre-booking intake to this FHIR appointment when present. Read
    // directly off the current URL rather than cached state — there is no
    // local copy to go stale.
    const rawIntakeId = searchParams.get("intake_id");
    const intakeId =
      rawIntakeId && Number.isFinite(Number(rawIntakeId))
        ? Number(rawIntakeId)
        : undefined;
    if (intakeId && bookedAppointment?.id) {
      await linkIntakeToAppointmentAction({
        payload: { id: intakeId, fhir_appointment_id: bookedAppointment.id },
      });
    }

    // Provision virtual consultation room — user_id is injected server-side
    if (bookedAppointment?.id) {
      const [, roomErr] = await createConsultationAction({
        payload: { fhir_appointment_id: bookedAppointment.id, org_id: orgId },
      });
      if (roomErr) {
        toast.error(
          "Appointment booked but consultation room creation failed. Contact support.",
        );
      }
    }

    setIsSuccessOpen(true);

    // Strip ?intake_id from the URL now that the whole flow is done. Deferred
    // to the very end — firing this mid-flow triggers a soft navigation that
    // re-renders the page while the booking handler is still mid-flight,
    // which silently drops everything queued after it (consultation room
    // creation, the success dialog). Still one-shot: a second booking in the
    // same session reads an already-cleared URL and won't re-link.
    if (intakeId) {
      router.replace(pathname, { scroll: false });
    }
  }, [
    selectedRole,
    selectedSlot,
    patientFhirId,
    patientDisplayName,
    userId,
    orgId,
    queryClient,
    searchParams,
    router,
    pathname,
  ]);

  /** Resets all wizard state and closes the success dialog. */
  const resetBooking = useCallback(() => {
    setStep(1);
    setSelectedRole(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setIsSuccessOpen(false);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const practitionerName = selectedRole
    ? getPractitionerName(selectedRole)
    : "";
  const practitionerSpecialty = selectedRole
    ? getPractitionerSpecialty(selectedRole)
    : "";
  const slotTime = selectedSlot ? getSlotTime(selectedSlot) : "";
  const slotDuration = selectedSlot ? getSlotDuration(selectedSlot) : null;

  return (
    // min-h-[calc(100dvh-132px)] matches this app's established convention
    // for the AppNavbar + breadcrumb chrome height (see e.g. AppointmentReview,
    // VoiceIntakeTest). Was previously -10rem (160px), which undershot the
    // true available height — on short-content steps (no scroll), the sticky
    // action bar below settled wherever this flex column ended rather than
    // the real viewport bottom, leaving a visible gap under it.
    <div className="flex flex-col min-h-[calc(100dvh-132px)] -mb-6">
      <div className="flex-1">
        {/* Page header */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold mb-1">Book an Appointment</h1>
          <p className="text-muted-foreground">
            Find and book with verified specialists
          </p>
        </div>

        <StepIndicator currentStep={step} />

        <div className="mb-4">
          {/* ── Step 1: Select Practitioner ── */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Filters */}
              <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
                <InputGroup>
                  <InputGroupInput
                    placeholder="Search name or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                </InputGroup>

                <div className="relative w-full md:w-auto min-w-50">
                  <Select
                    value={selectedSpecialty}
                    onValueChange={setSelectedSpecialty}
                  >
                    <SelectTrigger className="w-full h-9">
                      <Filter className="w-5 h-5 text-muted-foreground" />
                      <SelectValue placeholder="Specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-semibold">
                  Choose Your Specialist
                </h2>
                <span className="text-sm text-muted-foreground">
                  {filteredRoles.length} available
                </span>
              </div>

              {/* Practitioner grid */}
              {isLoadingRoles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredRoles.map((role) => (
                    <PractitionerCard
                      key={role.id}
                      role={role}
                      selected={selectedRole?.id === role.id}
                      onSelect={() => {
                        setSelectedRole(role);
                        setSelectedDate(null);
                        setSelectedSlot(null);
                      }}
                    />
                  ))}
                  {filteredRoles.length === 0 && (
                    <Card className="col-span-full p-6 text-center border border-dashed">
                      <p className="text-muted-foreground">
                        No practitioners found matching your criteria.
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedSpecialty("All");
                        }}
                        className="mt-2 w-fit mx-auto"
                      >
                        Clear filters
                      </Button>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Choose Date & Slot ── */}
          {step === 2 && selectedRole && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-4">
              {/* Header row with back + selected practitioner badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevStep}
                  className="text-muted-foreground self-start"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-muted/40">
                  <span className="text-muted-foreground text-sm">
                    Booking with
                  </span>
                  <Avatar className="h-6 w-6">
                    {selectedRole.practitioner_detail?.photo_url && (
                      <img
                        src={selectedRole.practitioner_detail.photo_url}
                        alt={practitionerName}
                      />
                    )}
                    <AvatarFallback>
                      {getProfileInitials(practitionerName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-foreground text-sm font-semibold">
                    {practitionerName}
                  </span>
                </div>
              </div>

              <Card className="py-4 px-4 h-fit">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Calendar — month view, single-date pick */}
                  <div>
                    <h3 className="font-semibold text-muted-foreground text-sm mb-4">
                      Available Dates{" "}
                      {selectedDate ? `(${formatDisplayDate(selectedDate)})` : null}
                    </h3>
                    <DateCalendar
                      mode="single"
                      selected={selectedDate ?? undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        setSelectedDate(d);
                        setSelectedSlot(null);
                      }}
                      disabled={isDayDisabled}
                      className="rounded-md border mx-auto p-3 [--cell-size:2.25rem]"
                      classNames={{
                        weekdays: "flex gap-1.5",
                        week: "mt-2 flex w-full gap-1.5",
                      }}
                    />
                  </div>

                  {/* Time Slot List */}
                  <div>
                    <h3 className="font-semibold mb-4 text-muted-foreground text-sm">
                      Available Times
                    </h3>
                    {!selectedDate ? (
                      <p className="text-sm text-muted-foreground py-4">
                        Pick a date to see available times.
                      </p>
                    ) : isLoadingSlots ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full rounded-md" />
                        ))}
                      </div>
                    ) : slotsForDate.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No available slots for this day. Please pick another
                        date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slotsForDate.map((slot) => {
                          const isSelected = selectedSlot?.id === slot.id;
                          const time = getSlotTime(slot);
                          const duration = getSlotDuration(slot);
                          return (
                            <Button
                              key={slot.id}
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => setSelectedSlot(slot)}
                              className="flex flex-col items-center gap-0 h-auto py-1"
                            >
                              <span className="flex items-center gap-1 text-xs">
                                <Clock className="w-3 h-3" />
                                {time}
                              </span>
                              {duration && (
                                <span className="text-[9px] opacity-70">
                                  {duration} min
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && selectedRole && selectedDate && selectedSlot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              <div className="mb-3">
                <h2 className="text-xl font-bold">Confirm Your Appointment</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Review the details below before confirming
                </p>
              </div>

              <Card className="overflow-hidden">
                {/* Hero banner */}
                <div className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent px-4 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-background border-2 border-primary/20 flex items-center justify-center text-base font-bold text-primary shadow-sm shrink-0">
                      {getProfileInitials(practitionerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        Appointment with
                      </p>
                      <h3 className="font-bold text-sm truncate">
                        {practitionerName}
                      </h3>
                      {practitionerSpecialty && (
                        <p className="text-xs text-muted-foreground truncate">
                          {practitionerSpecialty}
                        </p>
                      )}
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-0.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Ready to Book
                    </div>
                  </div>
                </div>

                {/* Detail tiles */}
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Appointment type / service */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div className="p-1.5 rounded-md bg-background border shadow-xs shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Type
                        </p>
                        <p className="font-semibold text-sm truncate">
                          {selectedSlot.appointment_type_display ??
                            selectedSlot.service_type?.[0]?.coding_display ??
                            "Consultation"}
                        </p>
                        {slotDuration && (
                          <p className="text-xs text-muted-foreground">
                            {slotDuration} min
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div className="p-1.5 rounded-md bg-background border shadow-xs shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Date
                        </p>
                        <p className="font-semibold text-sm">
                          {formatFullDate(selectedDate)}
                        </p>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/60 sm:col-span-2">
                      <div className="p-1.5 rounded-md bg-background border shadow-xs shrink-0">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Time
                        </p>
                        <p className="font-semibold text-sm">{slotTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
      {/* end flex-1 */}

      {/* ── Sticky bottom action bar ──
          Sticky offsets resolve against the scrollport's padding edge, so a
          plain `bottom-0` here still leaves (apps)/layout.tsx's <main> pb-4
          (16px) as a visible gap below the bar. `-bottom-4` feeds that 16px
          into the sticky offset itself (confirmed via computed styles:
          main's own rect bottom already touches the true viewport edge, so
          the gap is exactly main's padding, not something a margin trick on
          this element can reliably close — negative margin on a sticky box
          doesn't consistently affect its stuck offset across browsers). */}
      <div className="sticky -bottom-4 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-t flex justify-end">
        {step < 3 ? (
          <Button
            size="sm"
            className="w-full md:w-fit"
            disabled={
              (step === 1 && !selectedRole) ||
              (step === 2 && (!selectedDate || !selectedSlot))
            }
            onClick={handleNextStep}
          >
            {step === 1 ? "Continue to Time Selection" : "Review Booking"}
          </Button>
        ) : (
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handlePrevStep}>
              Modify Appointment
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmBooking}
              disabled={isBooking}
            >
              {isBooking && <Loader2 className="animate-spin mr-1" />}
              Confirm Booking
            </Button>
          </div>
        )}
      </div>

      {/* ── Success Dialog ── */}
      <Dialog open={isSuccessOpen} onOpenChange={resetBooking}>
        <DialogContent>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-400/20 rounded-full flex items-center justify-center mb-6 text-emerald-500 border border-emerald-400/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogHeader className="mb-4">
              <DialogTitle asChild>
                <h2 className="text-2xl text-center font-bold">
                  Appointment Confirmed!
                </h2>
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                Your appointment has been successfully booked.
              </DialogDescription>
            </DialogHeader>

            {/* Quick summary */}
            <div className="rounded-lg p-4 text-left mb-6 border">
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
                Quick Summary
              </h4>
              <div className="space-y-2 text-sm">
                {selectedRole && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-base">👤</span>
                    <span>{practitionerName}</span>
                  </div>
                )}
                {selectedDate && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatFullDate(selectedDate)}</span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{slotTime}</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-col! gap-3 w-full">
              <Button variant="default" className="w-full" asChild>
                <Link href="/bezs/telemedicine/patient/appointments">
                  View My Appointments
                </Link>
              </Button>
              <DialogClose asChild>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={resetBooking}
                >
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>

            <p className="text-xs text-muted-foreground mt-4">
              Please arrive 15 minutes early. Need to reschedule? Contact us 24
              hours in advance.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
