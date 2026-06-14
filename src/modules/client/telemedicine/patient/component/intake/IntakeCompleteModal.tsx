/**
 * IntakeCompleteModal — shown after the patient finishes an intake session.
 *
 * Layer: client / telemedicine / patient / intake
 *
 * Presents two options:
 *   1. "Book Appointment" → navigates to the booking wizard with ?intake_id={id}
 *      so the wizard can link the intake to the booked FHIR appointment.
 *   2. "Skip for now" → goes to the patient appointments list.
 *
 * Built as a simple Dialog (no Zustand store needed — the parent component
 * controls open state via an `open` prop).
 */

"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarPlus, CheckCircle2 } from "lucide-react";

/** Props for IntakeCompleteModal. */
interface IntakeCompleteModalProps {
  /** Controls dialog visibility. */
  open: boolean;
  /** Local Intake.id returned from createIntakeAction / updateIntakeAction. */
  intakeId: number;
  /** Localised base path for the booking route, e.g. "/en/bezs/telemedicine/patient". */
  basePath: string;
}

/**
 * Post-intake completion modal.
 *
 * @param open - Whether the dialog is visible.
 * @param intakeId - The completed intake's local ID.
 * @param basePath - Locale-prefixed base path for building links.
 */
export function IntakeCompleteModal({
  open,
  intakeId,
  basePath,
}: IntakeCompleteModalProps) {
  const router = useRouter();

  /**
   * Navigates to the booking wizard, injecting the intake ID as a query
   * param so the wizard can link the booked appointment back to this intake.
   */
  function handleBookAppointment() {
    router.push(`${basePath}/appointments/book?intake_id=${intakeId}`);
  }

  /** Navigates to the patient appointments list without booking. */
  function handleSkip() {
    router.push(`${basePath}/appointments`);
  }

  return (
    <Dialog open={open}>
      <DialogContent
        /** Prevent closing by clicking outside — force an explicit choice. */
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-sm"
      >
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-6" />
          </div>
          <DialogTitle className="text-center">Intake Complete</DialogTitle>
          <DialogDescription className="text-center">
            Your intake has been saved. Would you like to book an appointment
            with a doctor now?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleBookAppointment} className="w-full">
            <CalendarPlus className="mr-2 size-4" />
            Book an Appointment
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full"
          >
            Skip for now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
