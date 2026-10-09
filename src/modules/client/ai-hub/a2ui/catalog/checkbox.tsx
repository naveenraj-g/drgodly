"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { CheckboxNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Checkbox as ShadCNCheckbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: CheckboxNode;
  weight?: string | number;
}

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

  const handleChange = (checked: boolean) => {
    setChecked(checked);
  };

  // Scoped to surfaceId, not just component.id: the workflow JSON's checkbox
  // ids are static (e.g. "add_condition"), so re-rendering the same step a
  // second time in one session (e.g. going back and choosing again) creates
  // a second DOM element with the same id while the first is still mounted
  // (past chat messages stay in the DOM). A bare id="add_condition" would
  // collide with that earlier instance, and since HTML label/for resolves to
  // the *first* matching id in the document, clicking the label would then
  // toggle the stale checkbox from the earlier message instead of this one
  // (clicking the checkbox input itself was never affected — that's a direct
  // element reference, not an id lookup).
  //
  // The submitted field name still has to be the plain component.id, though
  // — form.tsx's collectFormData reads it straight off the DOM element, and
  // the workflow's own actions/validation schema expect that exact key (e.g.
  // "add_condition"), not a surfaceId-prefixed one. So the unique domId only
  // fixes the label/id association; data-field-name carries the real
  // submission key through for collectFormData to read instead of el.id.
  const domId = `${surfaceId}-${component.id}`;

  return (
    <div className="flex items-center space-x-2" style={{ flex: weight }}>
      <ShadCNCheckbox
        id={domId}
        data-field-name={component.id}
        checked={checked}
        onCheckedChange={handleChange}
      />
      {label && <Label htmlFor={domId}>{label}</Label>}
    </div>
  );
}
