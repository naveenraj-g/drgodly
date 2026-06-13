/**
 * TelecomTab — phone, email, fax and other contact points for the organization.
 */

"use client";

import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError } from "@/components/ui/field";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";
import { TELECOM_SYSTEMS, TELECOM_USES } from "../constants";

/** @see CreateOrganizationForm */
export function TelecomTab() {
  const form = useFormContext<TCreateOrgFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "telecom",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = form.formState.errors as any;

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Phone, email, fax and other contact points for the organization.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({ system: "phone", value: "" })}
          >
            <PlusIcon data-icon="inline-start" />
            Add Telecom
          </Button>
        </div>

        {fields.map((t, i) => (
          <div key={t.id} className="flex items-start gap-2">
            {/* System */}
            <Field className="w-32" data-invalid={!!e?.telecom?.[i]?.system || undefined}>
              <Controller
                control={form.control}
                name={`telecom.${i}.system`}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={!!e?.telecom?.[i]?.system}>
                      <SelectValue placeholder="System" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {TELECOM_SYSTEMS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {/* Value */}
            <Field className="flex-1" data-invalid={!!e?.telecom?.[i]?.value || undefined}>
              <Controller
                control={form.control}
                name={`telecom.${i}.value`}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="555-1234 / admin@org.com"
                    aria-invalid={!!e?.telecom?.[i]?.value}
                  />
                )}
              />
              {e?.telecom?.[i]?.value && (
                <FieldError>{e.telecom[i].value.message}</FieldError>
              )}
            </Field>

            {/* Use */}
            <Field className="w-28">
              <Controller
                control={form.control}
                name={`telecom.${i}.use`}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Use" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {TELECOM_USES.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {/* Rank */}
            <Field className="w-20">
              <Controller
                control={form.control}
                name={`telecom.${i}.rank`}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={1}
                    placeholder="Rank"
                    value={field.value ?? ""}
                    onChange={(ev) =>
                      field.onChange(ev.target.value === "" ? undefined : Number(ev.target.value))
                    }
                  />
                )}
              />
            </Field>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="mt-0.5 shrink-0 text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2Icon data-icon />
            </Button>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No telecom entries added.</p>
        )}
    </div>
  );
}
