/**
 * DoctorDashboard — main doctor portal dashboard component.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Two-panel layout:
 *   Left  (280px sticky) — TodayAppointmentList: appointments for the
 *                            selected date range (defaults to today); click to select.
 *   Right (flex-1)       — Detail cards for the selected appointment:
 *                            IntakeInsights (if pre-appointment intake exists)
 *                            ConsultationInsights (if completed consultation exists)
 *                            TreatmentEngine (if assessment_plan data exists)
 *
 * When the doctor clicks an appointment in the left panel, the dashboard
 * lazy-fetches intake and consultation data for that appointment ID via server
 * actions (called from the client via useEffect + useTransition).
 *
 * The appointment list itself starts from the server-fetched "today" data
 * (`initialAppointments`/`todayLabel`, still computed server-side in page.tsx
 * so the default view is SSR'd with no client fetch on first paint). Changing
 * the date range via AppointmentDateRangeFilter re-fetches client-side
 * through the same listAppointmentsAction the server page uses. Filtering
 * (status=pending,booked) and ordering (sort=date, ascending) are both
 * applied server-side on every fetch — see DASHBOARD_APPOINTMENT_STATUS /
 * DASHBOARD_APPOINTMENT_SORT below — so no client-side array filter or sort
 * runs on this list.
 *
 * Mirrors drgodly-mvp Dashboard.tsx in overall UX and card grid layout.
 */

"use client";

import { useCallback, useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  History,
  Loader2,
  MoreHorizontal,
  MousePointerClick,
  Stethoscope,
  Video,
  XCircle,
} from "lucide-react";
import { endOfDay, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TodayAppointmentList } from "./TodayAppointmentList";
import { DoctorAssistant } from "./DoctorAssistant";
import { ConsultationInsights } from "./ConsultationInsights";
import { TreatmentEngine } from "./TreatmentEngine";
import {
  AppointmentDateRangeFilter,
  formatRangeLabel,
  isTodayRange,
} from "./AppointmentDateRangeFilter";
import { PreviousAppointmentDialog } from "./PreviousAppointmentDialog";
import { IntakeInsights } from "../intake/IntakeInsights";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import {
  useDoctorStore,
  doctorStore,
} from "@/modules/client/telemedicine/doctor/stores/doctor.store";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import type { TConsultationResponse } from "@/modules/entities/schemas/consultation";

/** Maximum appointments to fetch per date-range query (matches page.tsx's initial SSR fetch). */
export const DASHBOARD_APPOINTMENTS_LIMIT = 50;

/**
 * The dashboard's schedule panel only surfaces appointments still awaiting
 * action — fulfilled/cancelled/etc. visits clutter the "what's coming up"
 * view and belong in Clinical Records/history instead. Filtered server-side
 * (fhir-server ORs comma-separated status values) rather than in the
 * browser, same server-side-everything approach as the Appointments table.
 */
export const DASHBOARD_APPOINTMENT_STATUS = "pending,booked";

/** Ascending by date — the dashboard reads as a chronological day plan. */
export const DASHBOARD_APPOINTMENT_SORT = "date";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoctorDashboardProps {
  /** Initial appointments (today, server-fetched) — seeds local state; superseded once the range changes. */
  appointments: TAppointmentResponse[];
  /** Doctor display name for the welcome heading. */
  doctorName: string;
  /** Today's date formatted for display — shown as-is while the range stays "today". */
  todayLabel: string;
  /** FHIR Practitioner id, needed to re-scope the appointment fetch when the date range changes. */
  practitionerId: number;
  /** Localised base href for appointment detail/action pages (e.g. /en/…/doctor/appointments). */
  viewHref: string;
  /** Localised base href for Clinical Records (e.g. /en/…/doctor/clinical-records). */
  clinicalRecordsHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Doctor portal dashboard — appointment list + selected appointment detail cards.
 *
 * @param appointments - Today's appointment list from the server page (initial/default range).
 * @param doctorName - Practitioner display name.
 * @param todayLabel - Formatted date string for the header.
 * @param practitionerId - FHIR Practitioner id, used to re-scope client-side range refetches.
 * @param viewHref - Localised base href for appointment detail/action pages.
 * @param clinicalRecordsHref - Localised base href for Clinical Records.
 */
export function DoctorDashboard({
  appointments: initialAppointments,
  doctorName,
  todayLabel,
  practitionerId,
  viewHref,
  clinicalRecordsHref,
}: DoctorDashboardProps) {
  const router = useRouter();
  // Status filter and ordering are applied server-side (page.tsx's SSR fetch
  // sends the same status/sort params) — no client-side filter/sort here.
  const [appointments, setAppointments] =
    useState<TAppointmentResponse[]>(initialAppointments);
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: new Date(),
    to: new Date(),
  }));
  const [selectedId, setSelectedId] = useState<number | null>(
    initialAppointments[0]?.id ?? null,
  );
  const [isPreviousVisitOpen, setIsPreviousVisitOpen] = useState(false);
  const [consultation, setConsultation] = useState<
    TConsultationResponse | null | undefined
  >(undefined); // undefined = loading / not yet fetched
  const [isPending, startTransition] = useTransition();
  const [isAppointmentsPending, startAppointmentsTransition] = useTransition();

  /* ── Fetch consultation whenever selection changes ── */
  useEffect(() => {
    if (selectedId === null) {
      setConsultation(null);
      return;
    }

    setConsultation(undefined); // trigger loading state

    startTransition(async () => {
      const [data] = await getConsultationByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: selectedId },
      });
      setConsultation(data ?? null);
    });
  }, [selectedId]);

  /**
   * Fetches appointments for a range and applies the result to state.
   * Shared by the explicit date-range picker and the mount-time timezone
   * correction below — mirrors page.tsx's initial SSR fetch (same action,
   * same start_from/start_to window mechanism), just triggered client-side.
   *
   * @param range - Range to fetch (both ends set).
   * @param options.resetSelection - True for a user-driven range change, so
   *   stale detail cards don't linger while the new list loads. False for
   *   the mount-time correction, which keeps the current selection if it's
   *   still present in the corrected list rather than flashing it away.
   */
  const fetchAppointments = useCallback(
    (range: DateRange, options: { resetSelection: boolean }) => {
      if (!range.from || !range.to) return;
      const from = range.from;
      const to = range.to;
      if (options.resetSelection) setSelectedId(null);

      startAppointmentsTransition(async () => {
        const [data, err] = await listAppointmentsAction({
          payload: {
            practitioner_id: practitionerId,
            start_from: startOfDay(from).toISOString(),
            start_to: endOfDay(to).toISOString(),
            status: DASHBOARD_APPOINTMENT_STATUS,
            sort: DASHBOARD_APPOINTMENT_SORT,
            limit: DASHBOARD_APPOINTMENTS_LIMIT,
            offset: 0,
          },
        });

        if (err) {
          toast.error("Failed to load appointments for that date range.");
          return;
        }

        const next = (data as TPaginatedAppointmentResponse | null)?.data ?? [];
        setAppointments(next);
        setSelectedId((current) =>
          current != null &&
          next.some((appointment) => appointment.id === current)
            ? current
            : (next[0]?.id ?? null),
        );
      });
    },
    [practitionerId],
  );

  /**
   * Refetches the appointment list for a newly picked date range.
   *
   * @param range - The newly selected range (both ends set).
   */
  const handleRangeChange = useCallback(
    (range: DateRange) => {
      if (!range.from || !range.to) return;
      setDateRange(range);
      fetchAppointments(range, { resetSelection: true });
    },
    [fetchAppointments],
  );

  /*
   * page.tsx computes "today" using the server process's local time
   * (setHours on a plain Date), which can differ from the doctor's browser
   * timezone — the server has no way to know it. Re-run the same fetch once
   * on mount using the browser's real "today" (dateRange's initial state,
   * computed client-side) so the SSR-seeded list and the picker's own
   * "Today" preset never silently disagree.
   */
  useEffect(() => {
    fetchAppointments(dateRange, { resetSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Confirm/Reschedule/Cancel are now actionable straight from this
   * dashboard's action bar, opened via the same doctorStore the full
   * appointments table uses. Those modals invalidate doctorAppointmentKeys
   * (a TanStack Query cache this component doesn't read from — its own list
   * is plain useState), so refetch explicitly whenever a doctor modal
   * transitions from open to closed, i.e. right after a successful mutation.
   */
  const isDoctorModalOpen = useDoctorStore((s) => s.isOpen);
  const wasDoctorModalOpenRef = useRef(false);
  useEffect(() => {
    if (wasDoctorModalOpenRef.current && !isDoctorModalOpen) {
      fetchAppointments(dateRange, { resetSelection: false });
    }
    wasDoctorModalOpenRef.current = isDoctorModalOpen;
  }, [isDoctorModalOpen, fetchAppointments, dateRange]);

  const isCurrentRangeToday = isTodayRange(dateRange);
  const rangeLabel = isCurrentRangeToday
    ? todayLabel
    : formatRangeLabel(dateRange);

  const assessmentPlan = consultation?.full_report?.assessment_plan as
    | Record<string, unknown>
    | undefined;
  const selectedAppointment =
    appointments.find((appointment) => appointment.id === selectedId) ?? null;

  // ── Action-bar eligibility — mirrors DoctorAppointmentColumns.tsx exactly ──
  const selectedStatus = selectedAppointment?.status;
  const canConfirm = selectedStatus === "pending";
  const canCancel = selectedStatus === "booked" || selectedStatus === "pending";
  const isSelectedBooked = selectedStatus === "booked";
  // Only slot-booked appointments have a slot reference; AI intake appointments
  // do not and the backend will reject the reschedule with 422 if no slot array exists.
  const canReschedule =
    (selectedStatus === "pending" || selectedStatus === "booked") &&
    !!selectedAppointment?.slot?.length;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Good {getGreeting()}, {doctorName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <span>
              <strong className="text-foreground">{appointments.length}</strong>{" "}
              appointment{appointments.length !== 1 ? "s" : ""}{" "}
              {isCurrentRangeToday ? "today" : "in range"}
            </span>
          </div>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* ── Two-panel body ── */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* ── Left: appointment list ── */}
        <div className="w-[272px] shrink-0 border rounded-xl overflow-hidden bg-card flex flex-col">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Schedule
            </p>
            <div className="flex items-center gap-1.5">
              {isAppointmentsPending && (
                <Loader2 className="size-3 animate-spin text-muted-foreground" />
              )}
              <AppointmentDateRangeFilter
                value={dateRange}
                onChange={handleRangeChange}
              />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <TodayAppointmentList
              appointments={appointments}
              selectedId={selectedId}
              onSelect={setSelectedId}
              emptyStateTitle={
                isCurrentRangeToday
                  ? "No appointments today"
                  : "No appointments in this range"
              }
              emptyStateDescription={
                isCurrentRangeToday
                  ? "Your schedule is clear for today."
                  : "Try a different date range."
              }
            />
          </div>
        </div>

        {/* ── Right: detail cards ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {selectedId === null ? (
            <EmptySelection />
          ) : (
            <>
              {/* Panel-level actions — same set the full appointments table
                  offers per row (DoctorAppointmentColumns.tsx), so the doctor
                  doesn't have to leave the dashboard to act on the appointment
                  they already have open here. */}
              <div className="flex items-center justify-between gap-2 px-1 pb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedAppointment && getPatientName(selectedAppointment)}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() =>
                      selectedAppointment &&
                      router.push(`${viewHref}/${selectedAppointment.id}`)
                    }
                  >
                    <Eye className="size-3.5" />
                    View
                  </Button>
                  {selectedAppointment?.subject_id != null && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() =>
                        router.push(
                          `${clinicalRecordsHref}/${selectedAppointment.subject_id}/${selectedAppointment.id}`,
                        )
                      }
                    >
                      <ClipboardList className="size-3.5" />
                      Clinical Records
                    </Button>
                  )}
                  {isSelectedBooked && (
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() =>
                        selectedAppointment &&
                        router.push(
                          `${viewHref}/online-consultation?appointmentId=${selectedAppointment.id}`,
                        )
                      }
                    >
                      <Video className="size-3.5" />
                      Join Meeting
                    </Button>
                  )}
                  {isSelectedBooked && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() =>
                        selectedAppointment &&
                        router.push(
                          `${viewHref}/inperson-consultation?appointmentId=${selectedAppointment.id}`,
                        )
                      }
                    >
                      <Stethoscope className="size-3.5" />
                      In-Person
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setIsPreviousVisitOpen(true)}
                  >
                    <History className="size-3.5" />
                    View previous visit
                  </Button>

                  {/* Review / Confirm / Reschedule / Cancel — same three-dot
                      grouping as the appointments table's row actions. */}
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
                      <DropdownMenuItem
                        className="gap-2 text-sm"
                        onClick={() =>
                          selectedAppointment &&
                          router.push(
                            `${viewHref}/${selectedAppointment.id}/review`,
                          )
                        }
                      >
                        <ClipboardList className="size-3.5 text-muted-foreground" />
                        Review
                      </DropdownMenuItem>
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
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
                {/* Intake insights — self-fetching component */}
                <IntakeInsights fhirAppointmentId={selectedId} />

                {/* Consultation insights */}
                {isPending || consultation === undefined ? (
                  <ConsultationLoadingCard />
                ) : consultation ? (
                  <>
                    <ConsultationInsights consultation={consultation} />
                    {assessmentPlan && (
                      <TreatmentEngine assessmentPlan={assessmentPlan} />
                    )}
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
      <DoctorAssistant selectedAppointment={selectedAppointment} />
      <PreviousAppointmentDialog
        open={isPreviousVisitOpen}
        onOpenChange={setIsPreviousVisitOpen}
        patientId={selectedAppointment?.subject_id}
        beforeStart={selectedAppointment?.start}
      />
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

/** Empty state shown when no appointment is selected. */
function EmptySelection() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <MousePointerClick className="size-8 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Select an appointment
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Click a patient from the schedule to view clinical details.
        </p>
      </div>
    </div>
  );
}

/** Skeleton loading state while consultation is being fetched. */
function ConsultationLoadingCard() {
  return (
    <div className="border rounded-xl p-6 flex items-center justify-center gap-2 text-muted-foreground text-sm bg-card">
      <Loader2 className="size-4 animate-spin" />
      Loading consultation data…
    </div>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Returns a time-appropriate greeting string. */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/** Returns the patient's display name from appointment participants. */
function getPatientName(appointment: TAppointmentResponse): string {
  return (
    appointment.subject_display ??
    appointment.participant?.find((p) => p.reference_type === "Patient")
      ?.reference_display ??
    "Unknown Patient"
  );
}
