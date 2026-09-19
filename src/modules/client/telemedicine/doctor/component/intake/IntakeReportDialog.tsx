/**
 * IntakeReportDialog — button + dialog showing a patient's pre-appointment
 * AI intake report during a live consultation.
 *
 * Layer: client / telemedicine / doctor / component / intake
 *
 * Used on both the online-consultation (DoctorConsult) and in-person-
 * consultation (InPersonConsultation) screens so a doctor mid-call can check
 * the intake without leaving the room. Wraps the same self-fetching
 * IntakeInsights the dashboard and PreviousAppointmentDialog already use,
 * with the same emptyState fallback pattern — Radix only mounts
 * DialogContent once opened, so the fetch doesn't run until the doctor
 * actually clicks the button.
 */

"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IntakeInsights } from "./IntakeInsights";

interface IntakeReportDialogProps {
  /** FHIR Appointment.id — passed straight to IntakeInsights. */
  fhirAppointmentId: number;
}

/**
 * Small "Intake" trigger button that opens a dialog with the appointment's
 * AI intake summary.
 *
 * @param fhirAppointmentId - FHIR Appointment.id to look up the linked intake for.
 */
export function IntakeReportDialog({ fhirAppointmentId }: IntakeReportDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Intake
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            AI Intake Summary
          </DialogTitle>
        </DialogHeader>
        <IntakeInsights
          fhirAppointmentId={fhirAppointmentId}
          emptyState={
            <p className="py-10 text-center text-sm text-muted-foreground">
              No intake report for this appointment.
            </p>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
