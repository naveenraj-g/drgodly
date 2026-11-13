/**
 * Card — A2UI catalog card component.
 *
 * Layer: client / ai-hub / a2ui / catalog
 *
 * Provides a clean, modern clinical container card for workflow steps, forms,
 * and dashboards with subtle border, shadow, and responsive padding.
 */

import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { CardNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Renderer } from "../rendering/renderer";
import { Card as ShadCNCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CardProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: CardNode;
  weight?: string | number;
}

/**
 * Renders an A2UI Card node with polished clinical container styling.
 *
 * @param props.processor  - IMessageProcessor for dispatching actions and resolving bindings.
 * @param props.surfaceId  - Unique identifier for the rendering surface.
 * @param props.component  - CardNode definition from the UI schema.
 * @param props.weight     - Flex weight for row/column distribution.
 * @returns React component wrapping child nodes.
 */
export function Card({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: CardProps) {
  const { theme } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const customRootClass = (component.properties as { classNames?: { root?: string } })?.classNames?.root;

  return (
    <ShadCNCard
      className={cn(
        "p-5 sm:p-6 rounded-xl border border-border/80 bg-card shadow-xs transition-shadow",
        customRootClass,
      )}
      style={{ flex: weight }}
    >
      {component.properties?.child && (
        <Renderer
          processor={processor}
          surfaceId={surfaceId}
          component={component.properties.child}
        />
      )}
    </ShadCNCard>
  );
}
