/**
 * Checkbox — A2UI catalog checkbox and option card component.
 *
 * Layer: client / ai-hub / a2ui / catalog
 *
 * Renders standard checkboxes or interactive medical selection tiles (variant="card").
 * Preserves the underlying shadcn button[role=checkbox] with data-field-name so
 * form.tsx collectFormData gathers boolean values accurately.
 */

"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { CheckboxNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Checkbox as ShadCNCheckbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Stethoscope, Activity, Pill, ClipboardList, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: CheckboxNode;
  weight?: string | number;
}

/**
 * Returns an optional Lucide icon matching common clinical category identifiers.
 *
 * @param iconName - Keyword or icon identifier.
 * @returns React node icon or null.
 */
function renderCategoryIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null;
  const lower = iconName.toLowerCase();
  if (lower.includes("condition") || lower.includes("stethoscope") || lower.includes("diagnosis")) {
    return <Stethoscope className="size-4.5 text-primary shrink-0" />;
  }
  if (lower.includes("observation") || lower.includes("vital") || lower.includes("activity")) {
    return <Activity className="size-4.5 text-primary shrink-0" />;
  }
  if (lower.includes("medication") || lower.includes("prescription") || lower.includes("pill")) {
    return <Pill className="size-4.5 text-primary shrink-0" />;
  }
  if (lower.includes("service") || lower.includes("order") || lower.includes("clipboard") || lower.includes("lab")) {
    return <ClipboardList className="size-4.5 text-primary shrink-0" />;
  }
  return null;
}

/**
 * Renders an A2UI Checkbox component supporting standard or clinical option card layouts.
 *
 * @param props.processor  - IMessageProcessor for state and bindings.
 * @param props.surfaceId  - Scoped surface id preventing DOM id collisions.
 * @param props.component  - CheckboxNode definition.
 * @param props.weight     - Flex weight.
 * @returns React checkbox or card element.
 */
export function Checkbox({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: CheckboxProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const initialValue = useMemo(
    () => Boolean(resolvePrimitive(component.properties.value)),
    [resolvePrimitive, component.properties.value],
  );
  const [checked, setChecked] = useState(initialValue);

  const label = useMemo(
    () => resolvePrimitive(component.properties.label),
    [resolvePrimitive, component.properties.label],
  );

  const description = useMemo(
    () =>
      resolvePrimitive(
        (component.properties as { description?: unknown })?.description,
      ),
    [resolvePrimitive, component.properties],
  );

  const variant =
    (component.properties as { variant?: string })?.variant || "default";
  const icon = (component.properties as { icon?: string })?.icon || component.id;

  const handleChange = (newChecked: boolean) => {
    setChecked(newChecked);
  };

  const domId = `${surfaceId}-${component.id}`;

  if (variant === "card") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            handleChange(!checked);
          }
        }}
        className={cn(
          "group relative flex items-start gap-3.5 rounded-xl border p-4 cursor-pointer transition-all duration-200 select-none",
          checked
            ? "border-primary/60 bg-primary/5 shadow-xs ring-1 ring-primary/25"
            : "border-border/70 bg-card hover:border-border hover:bg-muted/30",
        )}
        style={{ flex: weight }}
      >
        <div className="pt-0.5 shrink-0 flex items-center gap-2">
          <ShadCNCheckbox
            id={domId}
            data-field-name={component.id}
            checked={checked}
            onCheckedChange={handleChange}
            className="size-4.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {renderCategoryIcon(icon)}
            <Label
              htmlFor={domId}
              className="text-sm font-semibold leading-none cursor-pointer text-foreground group-hover:text-primary transition-colors"
            >
              {label}
            </Label>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {String(description)}
            </p>
          )}
        </div>
        {checked && (
          <CheckCircle2 className="size-4 text-primary shrink-0 opacity-80" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2" style={{ flex: weight }}>
      <ShadCNCheckbox
        id={domId}
        data-field-name={component.id}
        checked={checked}
        onCheckedChange={handleChange}
      />
      {label && (
        <Label htmlFor={domId} className="cursor-pointer text-sm">
          {label}
        </Label>
      )}
    </div>
  );
}
