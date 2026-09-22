/**
 * DoctorDashboard — main doctor portal dashboard component.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Two-panel layout:
 *   Left  (280px sticky) — TodayAppointmentList: today's appointments only
 *                            (no date-range picker — see DASHBOARD_APPOINTMENT_STATUS/
 *                            SORT below), filterable by patient name via the
 *                            search input; click one to select.
 *   Right (flex-1)       — Detail cards for the selected appointment:
 *                            IntakeInsights (if pre-appointment intake exists)
 *                            VitalsInsights (vitals trend charts — currently
 *                              sample data, see that file's header)
 *
 *                          Deliberately just these two — no TreatmentEngine/
 *                          ConsultationInsights/"no clinical data" fallback
 *                          card here; the dashboard only ever lists
 *                          pending/booked appointments (see
 *                          DASHBOARD_APPOINTMENT_STATUS below) and this panel
 *                          is meant to stay a quick pre-visit glance, not the
 *                          full clinical record (that's Clinical Records).
 *
 * When the doctor clicks an appointment in the left panel, IntakeInsights
 * self-fetches that appointment's linked intake (see that component).
 *
 * The appointment list itself starts from the server-fetched "today" data
 * (`initialAppointments`/`todayLabel`, still computed server-side in page.tsx
 * so the default view is SSR'd with no client fetch on first paint), then
 * gets re-fetched client-side once on mount (see the timezone-correction
 * effect below) and again after any Confirm/Reschedule/Cancel mutation —
 * always for "today", through the same listAppointmentsAction the server
 * page uses. Filtering (status=pending,booked) and ordering (sort=date,
 * ascending) are both applied server-side on every fetch — see
 * DASHBOARD_APPOINTMENT_STATUS / DASHBOARD_APPOINTMENT_SORT below. The
 * patient-name search box filters that already-sorted list client-side
 * (plain substring match on display name), so results stay time-ordered.
 *
 * Mirrors drgodly-mvp Dashboard.tsx in overall UX and card grid layout.
 */

"use client";

import { useCallback, useMemo, useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Loader2,
  MousePointerClick,
  Search,
  Stethoscope,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { startOfDayIST, endOfDayIST } from "@/modules/shared/helper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TodayAppointmentList } from "./TodayAppointmentList";
import { DoctorAssistant } from "./DoctorAssistant";
import { AppointmentDetailActions } from "./AppointmentDetailActions";
import { PreviousAppointmentDialog } from "./PreviousAppointmentDialog";
import { IntakeInsights } from "../intake/IntakeInsights";
import { VitalsInsights } from "./VitalsInsights";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { useDoctorStore } from "@/modules/client/telemedicine/doctor/stores/doctor.store";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

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
  /** Initial today's appointments (server-fetched) — seeds local state; refetched client-side too (see file header). */
  appointments: TAppointmentResponse[];
  /** Doctor display name for the welcome heading. */
  doctorName: string;
  /** Today's date formatted for display. */
  todayLabel: string;
  /** FHIR Practitioner id, used to scope the client-side "today" refetches. */
  practitionerId: number;
  /** Localised base href for appointment detail/action pages (e.g. /en/…/doctor/appointments). */
  viewHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Doctor portal dashboard — appointment list + selected appointment detail cards.
 *
 * @param appointments - Today's appointment list from the server page (initial state).
 * @param doctorName - Practitioner display name.
 * @param todayLabel - Formatted date string for the header.
 * @param practitionerId - FHIR Practitioner id, used to scope client-side "today" refetches.
 * @param viewHref - Localised base href for appointment detail/action pages.
 */
export function DoctorDashboard({
  appointments: initialAppointments,
  doctorName,
  todayLabel,
  practitionerId,
  viewHref,
}: DoctorDashboardProps) {
  const router = useRouter();
  // Status filter and ordering are applied server-side (page.tsx's SSR fetch
  // sends the same status/sort params) — no client-side filter/sort here.
  const [appointments, setAppointments] =
    useState<TAppointmentResponse[]>(initialAppointments);
  /** Client-side filter on the already-sorted "today" list — see the search input below. */
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    initialAppointments[0]?.id ?? null,
  );
  const [isPreviousVisitOpen, setIsPreviousVisitOpen] = useState(false);
  const [isAppointmentsPending, startAppointmentsTransition] = useTransition();
  // Whether the selected appointment has a linked pre-appointment intake —
  // reported by IntakeInsights (which self-fetches) via onLoaded. undefined
  // while loading. Drives whether VitalsInsights should span both grid
  // columns: IntakeInsights renders null once it settles on "no intake", at
  // which point VitalsInsights would otherwise sit alone in one half of the
  // row with a blank gap next to it.
  const [hasIntake, setHasIntake] = useState<boolean | undefined>(undefined);
  // Resets hasIntake the moment selectedId changes, during render rather
  // than in an effect — an effect here would fire one render late, letting
  // the previous appointment's stale "no data" verdict flash before the new
  // one's IntakeInsights fetch even starts.
  const [trackedSelectedId, setTrackedSelectedId] = useState(selectedId);
  if (selectedId !== trackedSelectedId) {
    setTrackedSelectedId(selectedId);
    setHasIntake(undefined);
  }

  /**
   * Fetches today's appointments and applies the result to state. Shared by
   * the mount-time timezone correction and the post-mutation refetch below —
   * mirrors page.tsx's initial SSR fetch (same action, same
   * start_from/start_to window mechanism), just triggered client-side and
   * always scoped to "today" (this dashboard has no date-range picker).
   *
   * @param options.resetSelection - True to clear the current selection
   *   before the new list loads. False keeps the current selection if it's
   *   still present in the refetched list rather than flashing it away.
   */
  const fetchTodayAppointments = useCallback(
    (options: { resetSelection: boolean }) => {
      const today = new Date();
      if (options.resetSelection) setSelectedId(null);

      startAppointmentsTransition(async () => {
        const [data, err] = await listAppointmentsAction({
          payload: {
            practitioner_id: practitionerId,
            start_from: startOfDayIST(today).toISOString(),
            start_to: endOfDayIST(today).toISOString(),
            status: DASHBOARD_APPOINTMENT_STATUS,
            sort: DASHBOARD_APPOINTMENT_SORT,
            limit: DASHBOARD_APPOINTMENTS_LIMIT,
            offset: 0,
          },
        });

        if (err) {
          toast.error("Failed to load today's appointments.");
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

  /*
   * page.tsx computes "today" using the server process's local time
   * (setHours on a plain Date), which can differ from the doctor's browser
   * timezone — the server has no way to know it. Re-run the same fetch once
   * on mount using the browser's real "today" so the SSR-seeded list and
   * this client's own notion of "today" never silently disagree.
   */
  useEffect(() => {
    fetchTodayAppointments({ resetSelection: false });
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
      fetchTodayAppointments({ resetSelection: false });
    }
    wasDoctorModalOpenRef.current = isDoctorModalOpen;
  }, [isDoctorModalOpen, fetchTodayAppointments]);

  /** Client-side substring match on patient display name — server list is
   *  already sorted (DASHBOARD_APPOINTMENT_SORT), so filtering preserves order. */
  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return appointments;
    return appointments.filter((appointment) =>
      getPatientName(appointment).toLowerCase().includes(query),
    );
  }, [appointments, searchQuery]);

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
    // h-[calc(100dvh-132px)] rather than h-full: the (apps) layout's `main`
    // wrapper doesn't actually propagate a bounded height down to us (h-full
    // there would resolve to nothing), so a fixed-height panel with its own
    // internal scrollbar — the schedule list below — needs a real viewport-
    // relative height here instead. Same 132px offset (navbar + breadcrumb +
    // page padding) already used by AppointmentReview.tsx and the
    // consultation/intake screens for exactly this reason.
    <div className="flex flex-col gap-0 h-[calc(100dvh-132px)]">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Good {getGreeting()}, {doctorName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <span>
              <strong className="text-foreground">{appointments.length}</strong>{" "}
              appointment{appointments.length !== 1 ? "s" : ""} today
            </span>
          </div>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* ── Two-panel body ──
          Side-by-side at lg (1024px) and up (fixed-width schedule list next
          to the flexible detail panel — not an even split, the schedule is
          just a list of narrow cards); below that they stack into a single
          column. This dashboard also gets squeezed further whenever the app
          sidebar is open (see AppointmentDetailActions' own compact
          breakpoints for the same reason). */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
        {/* ── Left: appointment list — fixed height while stacked (mobile)
            so it doesn't claim the whole viewport above the detail panel;
            fixed width and full available height once side-by-side. ── */}
        <div className="h-85 lg:h-auto w-full lg:w-68 shrink-0 border rounded-xl overflow-hidden bg-card flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name…"
                className="h-8 pl-8 text-xs"
              />
            </div>
            {isAppointmentsPending && (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-h-0">
            <TodayAppointmentList
              appointments={filteredAppointments}
              selectedId={selectedId}
              onSelect={setSelectedId}
              emptyStateTitle={
                searchQuery.trim() ? "No matching patients" : "No appointments today"
              }
              emptyStateDescription={
                searchQuery.trim()
                  ? "Try a different name."
                  : "Your schedule is clear for today."
              }
            />
          </div>
        </div>

        {/* ── Right: detail cards ──
            @container: the card grid below reacts to THIS panel's own
            width, not the viewport's — it shares the viewport with the
            schedule list and the app's own nav sidebar, so a viewport-based
            breakpoint (e.g. xl:) could be satisfied while this panel itself
            is still nowhere near wide enough for two columns. */}
        <div className="flex-1 min-h-0 overflow-y-auto @container">
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
                  <AppointmentDetailActions
                    selectedAppointment={selectedAppointment ?? null}
                    canConfirm={canConfirm}
                    canReschedule={canReschedule}
                    canCancel={canCancel}
                    onViewPreviousVisit={() => setIsPreviousVisitOpen(true)}
                  />
                </div>
              </div>

              {/* Side by side once this panel itself (not the viewport —
                  see the @container note above) is wide enough for both to
                  read comfortably; stacked below that. */}
              <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-4 pb-4">
                <IntakeInsights
                  fhirAppointmentId={selectedId}
                  onLoaded={setHasIntake}
                />
                {/* Spans both columns once IntakeInsights has settled on
                    "no intake" (renders null) — otherwise this would sit
                    alone in one half of the row with a blank gap beside it. */}
                <div className={hasIntake === false ? "@3xl:col-span-2" : undefined}>
                  <VitalsInsights />
                </div>
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
