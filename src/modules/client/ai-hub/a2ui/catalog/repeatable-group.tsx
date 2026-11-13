/**
 * RepeatableGroup — A2UI catalog component for dynamic multi-item arrays.
 *
 * Layer: client / ai-hub / a2ui / catalog
 *
 * Renders an array of identical component templates that can be added,
 * removed, or duplicated by the user. Serializes all items into a hidden JSON
 * input picked up by form.tsx collectFormData.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { RepeatableGroupNode, AnyComponentNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Renderer } from "../rendering/renderer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy } from "lucide-react";

let _instanceCounter = 0;
function nextInstanceId(): string {
  return String(++_instanceCounter);
}

interface ItemInstance {
  instanceId: string;
  nodes: AnyComponentNode[];
}

function cloneWithPrefix(
  nodes: AnyComponentNode[],
  prefix: string,
): AnyComponentNode[] {
  return nodes.map((node) => {
    const cloned = { ...node, id: `${prefix}${node.id}` } as AnyComponentNode;
    const props = (cloned as { properties?: { children?: AnyComponentNode[] } })
      .properties;
    if (props && Array.isArray(props.children)) {
      (
        cloned as { properties: { children: AnyComponentNode[] } }
      ).properties = {
        ...props,
        children: cloneWithPrefix(props.children, prefix),
      };
    }
    return cloned;
  });
}

function collectContainerData(
  container: HTMLElement,
  prefix: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  const inputs = container.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input, textarea, select");

  inputs.forEach((el) => {
    const id = el.id;
    if (!id || !id.startsWith(prefix)) return;
    const fieldId = id.slice(prefix.length);
    if (!fieldId) return;

    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") {
        data[fieldId] = el.checked;
      } else if (el.type === "number" || el.type === "range") {
        data[fieldId] = el.valueAsNumber;
      } else if (el.type === "hidden" && el.dataset.json === "true") {
        try {
          data[fieldId] = JSON.parse(el.value);
        } catch {
          data[fieldId] = el.value;
        }
      } else {
        data[fieldId] = el.value;
      }
    } else {
      data[fieldId] = (el as HTMLTextAreaElement | HTMLSelectElement).value;
    }
  });

  const checkboxes = container.querySelectorAll<HTMLButtonElement>(
    'button[role="checkbox"]',
  );
  checkboxes.forEach((el) => {
    const id = el.id;
    if (!id || !id.startsWith(prefix)) return;
    const fieldId = id.slice(prefix.length);
    if (!fieldId) return;
    data[fieldId] = el.getAttribute("data-state") === "checked";
  });

  return data;
}

interface RepeatableGroupProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: RepeatableGroupNode;
  weight?: string | number;
}

/**
 * Renders an A2UI RepeatableGroup with polished clinical item cards and actions.
 *
 * @param props.processor  - IMessageProcessor for dispatching actions.
 * @param props.surfaceId  - Scoped surface id.
 * @param props.component  - RepeatableGroup definition.
 * @param props.weight     - Flex weight.
 * @returns React repeatable group container.
 */
export function RepeatableGroup({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: RepeatableGroupProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const groupId = component.id;
  const template = component.properties.template ?? [];

  const label = resolvePrimitive(component.properties.label);
  const addLabel =
    resolvePrimitive(component.properties.addLabel) || "Add Item";
  const defaultCount = Math.max(
    1,
    Number(resolvePrimitive(component.properties.defaultCount) ?? 1),
  );
  const minItems = Number(resolvePrimitive(component.properties.minItems) ?? 0);
  const maxItems = Number(
    resolvePrimitive(component.properties.maxItems) ?? Infinity,
  );
  const allowDuplicate = Boolean(
    resolvePrimitive(component.properties.allowDuplicate),
  );

  const makeItem = useCallback((): ItemInstance => {
    const instanceId = nextInstanceId();
    const prefix = `${groupId}__item${instanceId}__`;
    return { instanceId, nodes: cloneWithPrefix(template, prefix) };
  }, [groupId, template]);

  const [items, setItems] = useState<ItemInstance[]>(() =>
    Array.from({ length: defaultCount }, () => makeItem()),
  );

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const syncToHiddenInput = useCallback(() => {
    if (!hiddenInputRef.current) return;
    const allData = items.map((item) => {
      const el = itemRefs.current.get(item.instanceId);
      if (!el) return {};
      return collectContainerData(el, `${groupId}__item${item.instanceId}__`);
    });
    hiddenInputRef.current.value = JSON.stringify(allData);
  }, [items, groupId]);

  useEffect(() => {
    syncToHiddenInput();
  }, [syncToHiddenInput]);

  const addItem = useCallback(() => {
    if (items.length >= maxItems) return;
    setItems((prev) => [...prev, makeItem()]);
  }, [items.length, maxItems, makeItem]);

  const removeItem = useCallback(
    (instanceId: string) => {
      if (items.length <= minItems) return;
      itemRefs.current.delete(instanceId);
      setItems((prev) => prev.filter((item) => item.instanceId !== instanceId));
    },
    [items.length, minItems],
  );

  const duplicateItem = useCallback(
    (instanceId: string) => {
      if (items.length >= maxItems) return;
      setItems((prev) => {
        const idx = prev.findIndex((item) => item.instanceId === instanceId);
        const newItem = makeItem();
        const updated = [...prev];
        updated.splice(idx + 1, 0, newItem);
        return updated;
      });
    },
    [items.length, maxItems, makeItem],
  );

  const canRemove = items.length > minItems;
  const canAdd = items.length < maxItems;

  return (
    <div className="space-y-3.5" style={{ flex: weight }}>
      {label && (
        <Label className="text-sm font-semibold tracking-tight text-foreground">
          {label}
        </Label>
      )}

      <div
        className="space-y-3.5"
        onInput={syncToHiddenInput}
        onChange={syncToHiddenInput}
      >
        {items.map((item, index) => (
          <div
            key={item.instanceId}
            ref={(el) => {
              if (el) itemRefs.current.set(item.instanceId, el);
            }}
            className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-4 shadow-2xs transition-colors hover:border-border/90"
            data-repeater-group={groupId}
            data-repeater-item={index}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                  {index + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Entry {index + 1}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {allowDuplicate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateItem(item.instanceId)}
                    disabled={!canAdd}
                    title="Duplicate entry"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.instanceId)}
                  disabled={!canRemove}
                  title="Remove entry"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {item.nodes.map((child) => (
              <Renderer
                key={child.id}
                processor={processor}
                surfaceId={surfaceId}
                component={child}
                weight={child.weight ?? "initial"}
              />
            ))}
          </div>
        ))}
      </div>

      <input
        ref={hiddenInputRef}
        id={component.id}
        type="hidden"
        data-json="true"
        defaultValue="[]"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={!canAdd}
        className="w-full h-9 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-primary font-medium transition-all"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {addLabel}
      </Button>
    </div>
  );
}
