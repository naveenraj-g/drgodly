/**
 * DeleteAppointmentModal — self-contained confirmation dialog for deleting an appointment.
 *
 * Layer: client / telemedicine / doctor / modals / appointments
 *
 * Opens when the doctor store's type === "deleteAppointment".
 * Reads the target appointment from store data. No props required.
 * Uses AlertDialog (destructive pattern) and calls deleteAppointmentAction.
 * Mounted once inside DoctorModalProvider.
 */

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { deleteAppointmentAction } from "@/modules/server/presentation/actions/appointment";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { useDoctorStore } from "../../stores/doctor.store";
import { doctorAppointmentKeys } from "../../component/appointments/list/appointmentQueries";

/**
 * Self-contained delete confirmation dialog.
 * Reads the target appointment from the doctor store — no external props needed.
 * Mounted once in DoctorModalProvider.
 */
export function DeleteAppointmentModal() {
  const isOpen = useDoctorStore((s) => s.isOpen);
  const type = useDoctorStore((s) => s.type);
  const data = useDoctorStore((s) => s.data);
  const onClose = useDoctorStore((s) => s.onClose);
  const queryClient = useQueryClient();

  /** Only active when this specific modal type is set. */
  const open = isOpen && type === "deleteAppointment";

  const { execute, isPending } = useServerAction(deleteAppointmentAction, {
    onSuccess: () => {
      toast.success("Appointment deleted");
      /** Invalidate all doctor appointment queries so the table refreshes. */
      void queryClient.invalidateQueries({ queryKey: doctorAppointmentKeys.all });
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to delete appointment" });
    },
  });

  /**
   * Executes the permanent delete action.
   */
  async function handleDelete() {
    if (!data?.appointment?.id) return;
    await execute({ payload: { id: data.appointment.id } });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the appointment record. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
