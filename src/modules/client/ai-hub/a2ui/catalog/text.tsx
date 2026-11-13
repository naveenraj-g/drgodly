/**
 * Text — A2UI catalog text rendering component.
 *
 * Layer: client / ai-hub / a2ui / catalog
 *
 * Renders formatted strings, markdown snippets, headings, and captions
 * using calibrated typography tokens tailored for clinical chat workflows.
 */

"use client";

import React, { useMemo } from "react";
import MarkedReact, { ReactRenderer } from "marked-react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { TextNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

interface TextProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: TextNode;
  weight?: string | number;
}

function sanitizeHref(href: string): string {
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol === "javascript:") return "#";
    return href;
  } catch {
    return href;
  }
}

const inlineRenderer: Partial<ReactRenderer> = {
  strong(children) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
  em(children) {
    return <em className="italic">{children}</em>;
  },
  codespan(code) {
    return (
      <code className="px-1.5 py-0.5 text-xs rounded text-primary bg-primary/10 font-mono">
        {code}
      </code>
    );
  },
  link(href, text) {
    const safe = sanitizeHref(href);
    return (
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium"
      >
        {text}
      </a>
    );
  },
};

const hintClasses: Record<string, string> = {
  h1: "text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
  h2: "text-xl sm:text-2xl font-semibold tracking-tight text-foreground",
  h3: "text-base sm:text-lg font-semibold tracking-tight text-foreground",
  h4: "text-sm font-semibold tracking-tight text-foreground",
  h5: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
  caption: "text-xs text-muted-foreground leading-relaxed",
  monospaced: "font-mono text-xs text-muted-foreground",
  body: "text-sm leading-relaxed text-foreground",
};

/**
 * Renders an A2UI Text node with markdown inline formatting and usageHint styling.
 *
 * @param props.processor  - IMessageProcessor for state and bindings.
 * @param props.surfaceId  - Unique identifier for the rendering surface.
 * @param props.component  - TextNode definition.
 * @param props.weight     - Flex weight.
 * @returns React text element.
 */
export function Text({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: TextProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const text = useMemo(
    () => String(resolvePrimitive(component.properties.text) ?? "(empty)"),
    [resolvePrimitive, component.properties.text],
  );

  const usageHint = component.properties.usageHint ?? "body";
  const className = hintClasses[usageHint] ?? "text-sm";

  return (
    <div className={className} style={{ flex: weight }}>
      <MarkedReact
        renderer={inlineRenderer}
        gfm={true}
        breaks={true}
        isInline={true}
      >
        {text}
      </MarkedReact>
    </div>
  );
}
