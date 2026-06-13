/**
 * BasicTab — core Organization fields: name, type, active, and partOf reference.
 *
 * Owns the terminology hook and type-select logic so the parent form shell
 * doesn't need to know about the type array's internal structure.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  FormInput,
  FormSwitch,
} from "@/modules/client/shared/components/CustomFormFields";
import { useConceptsForField } from "@/modules/client/shared/queries/terminology.queries";
import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

/**
 * Renders the Basic tab content — no props needed, reads form via useFormContext.
 */
export function BasicTab() {
  const form = useFormContext<TCreateOrgFormSchema>();
  const {
    formState: { errors },
  } = form;

  /** Live terminology concepts for Organization.type — 10-min stale time. */
  const { data: typeTerminology, isLoading: isLoadingTypes } =
    useConceptsForField("Organization", "type");

  /** Derive the currently selected type code from the watched type array. */
  const currentTypeCode =
    useWatch({ control: form.control, name: "type" })?.[0]?.coding_code ?? "";

  /**
   * Replaces the entire type array with a single entry matching the chosen concept.
   * @param code - The coding_code selected from the terminology dropdown.
   */
  function handleTypeSelect(code: string) {
    const concept = typeTerminology?.concepts.find((c) => c.code === code);
    if (concept) {
      form.setValue(
        "type",
        [
          {
            coding_system: concept.system,
            coding_code: concept.code,
            coding_display: concept.display,
          },
        ],
        { shouldValidate: true },
      );
    }
  }

  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      {/* Name */}
      <FormInput
        control={form.control}
        name="name"
        label="Name *"
        placeholder="General Hospital"
      />

      {/* Organization type — sourced live from terminology service */}
      <Field data-invalid={!!errors.type || undefined}>
        <FieldLabel>Organization Type *</FieldLabel>
        <Select
          value={currentTypeCode}
          onValueChange={handleTypeSelect}
          disabled={isLoadingTypes}
        >
          <SelectTrigger aria-invalid={!!errors.type}>
            <SelectValue
              placeholder={isLoadingTypes ? "Loading types…" : "Select a type"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {typeTerminology?.concepts.map((concept) => (
                <SelectItem key={concept.code} value={concept.code}>
                  {concept.display}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {errors.type && (
          <FieldError>
            {(errors.type as { message?: string }).message ??
              "At least one organization type is required"}
          </FieldError>
        )}
      </Field>

      {/* Active */}
      <FormSwitch
        control={form.control}
        name="active"
        label="Active"
        description="Inactive organizations are hidden from clinical workflows."
        descriptionPlace="bottom"
      />

      <Separator />

      {/* Part-of */}
      <FormInput
        control={form.control}
        name="partof"
        label="Part Of (reference)"
        placeholder="Organization/190001"
      />
      <FormInput
        control={form.control}
        name="partof_display"
        label="Part Of Display"
        placeholder="Parent Health Network"
      />
    </FieldGroup>
  );
}
