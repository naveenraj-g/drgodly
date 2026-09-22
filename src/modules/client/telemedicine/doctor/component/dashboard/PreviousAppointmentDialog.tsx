/**
 * PreviousAppointmentDialog — shows a patient's most recent completed visit.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Opened from the dashboard's right panel once an appointment is selected.
 * Looks up the patient's most recent OTHER appointment with status
 * "fulfilled" (FHIR's "completed" status) that started before the currently
 * selected appointment, then reuses the same detail components the main
 * dashboard already renders for the selected appointment — IntakeInsights
 * and ConsultationInsights/TreatmentEngine — under two tabs, so "previous
 * visit" always looks like a smaller version of the main dashboard's own
 * right panel rather than a separate UI to maintain.
 *
 * Self-fetching: given just a patientId and a beforeStart bound, it finds
 * the previous appointment and its consultation itself once opened.
 */

"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Stethoscope, UserRound } from "lucide-react";
import { formatDisplayDate, formatDisplayTime } from "@/modules/shared/helper";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { IntakeInsights } from "../intake/IntakeInsights";
import { ConsultationInsights } from "./ConsultationInsights";
import { TreatmentEngine } from "./TreatmentEngine";
import type { TAppointmentResponse, TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TConsultationResponse } from "@/modules/entities/schemas/consultation";

/** Maximum candidate appointments to scan when finding the most recent completed visit. */
const HISTORY_LOOKUP_LIMIT = 50;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreviousAppointmentDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should open/close. */
  onOpenChange: (open: boolean) => void;
  /** Patient FHIR id whose history to look up. */
  patientId: number | null | undefined;
  /** Only appointments starting before this ISO datetime count as "previous". */
  beforeStart: string | null | undefined;
}

type LookupState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "found"; appointment: TAppointmentResponse };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the patient's display name from appointment participants. */
function getPatientName(appt: TAppointmentResponse): string {
  return (
    appt.subject_display ??
    appt.participant?.find((p) => p.reference_type === "Patient")?.reference_display ??
    "Unknown Patient"
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Dialog showing a patient's most recent completed visit — appointment
 * summary header, plus Intake / Doctor's Report tabs.
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Open/close callback.
 * @param patientId - Patient FHIR id to look up history for.
 * @param beforeStart - Only appointments before this datetime count as "previous".
 */
export function PreviousAppointmentDialog({
  open,
  onOpenChange,
  patientId,
  beforeStart,
}: PreviousAppointmentDialogProps) {
  const [lookup, setLookup] = useState<LookupState>({ status: "loading" });
  const [consultation, setConsultation] = useState<
    TConsultationResponse | null | undefined
  >(undefined);

  /* ── Find the previous fulfilled appointment whenever the dialog opens ── */
  useEffect(() => {
    if (!open || patientId == null) return;

    let cancelled = false;
    setLookup({ status: "loading" });
    setConsultation(undefined);

    (async () => {
      const [data] = await listAppointmentsAction({
        payload: {
          patient_id: patientId,
          status: "fulfilled",
          start_to: beforeStart ?? undefined,
          limit: HISTORY_LOOKUP_LIMIT,
          offset: 0,
        },
      });
      if (cancelled) return;

      const candidates = (data as TPaginatedAppointmentResponse | null)?.data ?? [];
      // The API doesn't guarantee ordering — pick the latest start time ourselves.
      const previous = [...candidates].sort((a, b) => {
        const aT = a.start ? new Date(a.start).getTime() : 0;
        const bT = b.start ? new Date(b.start).getTime() : 0;
        return bT - aT;
      })[0];

      if (!previous) {
        setLookup({ status: "not-found" });
        return;
      }
      setLookup({ status: "found", appointment: previous });

      const [consultationData] = await getConsultationByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: previous.id },
      });
      if (!cancelled) setConsultation(consultationData ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, patientId, beforeStart]);

  const assessmentPlan =
    lookup.status === "found"
      ? (consultation?.full_report?.assessment_plan as Record<string, unknown> | undefined)
      : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-4" />
            Previous Visit
          </DialogTitle>
        </DialogHeader>

        {lookup.status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Looking up the patient&apos;s previous visit…
          </div>
        )}

        {lookup.status === "not-found" && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No previous completed visit found
            </p>
            <p className="text-xs text-muted-foreground/70">
              This patient has no earlier appointment marked as completed.
            </p>
          </div>
        )}

        {lookup.status === "found" && (
          <div className="flex flex-col gap-4">
            {/* Appointment summary */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
              <Badge
                variant="outline"
                className="gap-1 border-emerald-600/20 bg-emerald-600/10 text-emerald-600"
              >
                Completed
              </Badge>
              <span className="text-sm font-medium">{getPatientName(lookup.appointment)}</span>
              {lookup.appointment.start && (
                <span className="text-xs text-muted-foreground">
                  {formatDisplayDate(lookup.appointment.start)} at {formatDisplayTime(lookup.appointment.start)}
                </span>
              )}
              {lookup.appointment.appointment_type_display && (
                <span className="text-xs text-muted-foreground">
                  {lookup.appointment.appointment_type_display}
                </span>
              )}
            </div>

            <Tabs defaultValue="report">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="report" className="gap-1.5">
                  <Stethoscope className="size-3.5" />
                  Doctor&apos;s Report
                </TabsTrigger>
                <TabsTrigger value="intake" className="gap-1.5">
                  <FileText className="size-3.5" />
                  Intake
                </TabsTrigger>
              </TabsList>

              {/* No inner max-h/overflow here — nesting a scrolling flex
                  container inside the dialog's own flex/grid ancestors
                  needs min-h-0 to actually scroll (a classic flexbox trap)
                  and doubles up on scroll regions besides. Simpler and
                  reliable: let the whole dialog scroll as one unit via
                  DialogContent's own max-h-[90vh] overflow-y-auto. */}
              <TabsContent value="report" className="mt-3 flex flex-col gap-4">
                {consultation === undefined ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading doctor&apos;s report…
                  </div>
                ) : consultation ? (
                  <>
                    <ConsultationInsights consultation={consultation} />
                    {assessmentPlan && <TreatmentEngine assessmentPlan={assessmentPlan} />}
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No doctor&apos;s report was recorded for this visit.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="intake" className="mt-3">
                <IntakeInsights
                  fhirAppointmentId={lookup.appointment.id}
                  emptyState={
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No intake report for this appointment.
                    </p>
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
