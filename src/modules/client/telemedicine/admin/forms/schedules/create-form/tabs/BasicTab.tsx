/**
 * BasicTab — core Schedule fields: active, comment, planning horizon.
 */

"use client";

import { useFormContext, Controller } from "react-hook-form";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  FormSwitch,
  FormTextarea,
} from "@/modules/client/shared/components/CustomFormFields";
import type { TCreateScheduleFormSchema } from "@/modules/entities/schemas/schedule";

/** Renders the Basic tab content — no props needed, reads form via useFormContext. */
export function BasicTab() {
  const form = useFormContext<TCreateScheduleFormSchema>();

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <FormSwitch control={form.control} name="active" label="Active" />

      <FormTextarea
        control={form.control}
        name="comment"
        label="Comment"
        placeholder="e.g. Cardiology OPD — Dr. Smith, Mon/Wed/Fri"
      />

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Planning Horizon Start</FieldLabel>
          <Controller
            control={form.control}
            name="planning_horizon_start"
            render={({ field }) => (
              <Input {...field} value={field.value ?? ""} type="datetime-local" />
            )}
          />
        </Field>
        <Field>
          <FieldLabel>Planning Horizon End</FieldLabel>
          <Controller
            control={form.control}
            name="planning_horizon_end"
            render={({ field }) => (
              <Input {...field} value={field.value ?? ""} type="datetime-local" />
            )}
          />
        </Field>
      </div>
    </FieldGroup>
  );
}
