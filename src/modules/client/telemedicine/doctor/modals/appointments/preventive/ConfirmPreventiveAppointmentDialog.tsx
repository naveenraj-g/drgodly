/**
 * ConfirmPreventiveAppointmentDialog — confirm dialog for preventive-medicine appointments.
 *
 * Layer: client / telemedicine / doctor / modals / appointments / preventive
 *
 * Rendered by ConfirmAppointmentModal instead of its plain AlertDialog when the
 * appointment's specialty is 409968004. The doctor MUST pick an active plan
 * definition; confirming then runs confirmPreventiveAppointmentAction, which
 * creates the encounter, applies the plan (ServiceRequests) and marks the
 * appointment fulfilled.
 */

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerAction } from "zsa-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TApplyDefinitionResponse } from "@/modules/entities/schemas/definition-apply";
import { confirmPreventiveAppointmentAction } from "@/modules/server/presentation/actions/appointment";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { doctorAppointmentKeys } from "../../../component/appointments/list/appointmentQueries";
import { PlanDefinitionCard } from "./PlanDefinitionCard";
import {
  fetchActivityDefinitionMap,
  fetchActivePlanDefinitions,
  preventiveKeys,
} from "./preventiveQueries";

interface IConfirmPreventiveAppointmentDialogProps {
  open: boolean;
  appointment: TAppointmentResponse;
  onClose: () => void;
}

/**
 * Plan-picker confirm dialog. Confirm stays disabled until a plan is chosen.
 */
export function ConfirmPreventiveAppointmentDialog({
  open,
  appointment,
  onClose,
}: IConfirmPreventiveAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const plans = useQuery({
    queryKey: preventiveKeys.plans,
    queryFn: fetchActivePlanDefinitions,
    enabled: open,
  });
  const activities = useQuery({
    queryKey: preventiveKeys.activities,
    queryFn: fetchActivityDefinitionMap,
    enabled: open,
  });

  const { execute, isPending } = useServerAction(confirmPreventiveAppointmentAction, {
    onSuccess: ({ data }) => {
      // The ZSA transport wrapper widens the output type, so restore it here.
      const apply = data?.apply as TApplyDefinitionResponse | undefined;
      toast.success(
        `Appointment fulfilled — ${apply?.total ?? 0} service request${apply?.total === 1 ? "" : "s"} created`,
      );
      // Surface why any action produced nothing (retired / duplicate / unsupported kind).
      apply?.skipped.forEach((s) =>
        toast.warning(`Skipped ${s.action_title ?? s.definition ?? "action"}: ${s.reason}`),
      );
      void queryClient.invalidateQueries({ queryKey: doctorAppointmentKeys.all });
      setSelectedPlanId(null);
      onClose();
    },
    onError: ({ err }) => {
      handleZSAError({ err, fallbackMessage: "Failed to confirm appointment" });
    },
  });

  /** Runs the confirm flow for the chosen plan. */
  async function handleConfirm() {
    if (selectedPlanId == null) return;
    await execute({
      payload: { appointment_id: appointment.id, plan_definition_id: selectedPlanId },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirm preventive appointment</DialogTitle>
          <DialogDescription>
            Choose the plan to apply. Confirming creates the encounter, orders every action of the
            plan and marks the appointment <strong>Fulfilled</strong>.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-3">
          <div className="space-y-2">
            {plans.isLoading && <Skeleton className="h-20 w-full" />}
            {plans.isError && (
              <p className="text-sm text-destructive">Could not load plan definitions.</p>
            )}
            {plans.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active plan definitions found for your organisation.
              </p>
            )}
            {plans.data?.map((plan) => (
              <PlanDefinitionCard
                key={plan.id}
                plan={plan}
                selected={selectedPlanId === plan.id}
                activities={activities.data ?? {}}
                onSelect={() => setSelectedPlanId(plan.id)}
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Not yet
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || selectedPlanId == null}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm &amp; apply plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
