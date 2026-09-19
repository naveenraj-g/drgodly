/**
 * Markdown — shared AI-response renderer.
 *
 * Layer: client / shared / components
 *
 * Any AI-generated text in this app (SOAP note fields, assessment/treatment
 * plans, intake report fields, chat replies, …) may or may not contain
 * Markdown syntax depending on what the model happened to emit. Parsing it
 * unconditionally through `marked-react` handles both cases correctly:
 * plain text has no Markdown syntax to match, so it renders as an ordinary
 * paragraph identical to a plain-text render; text that does contain
 * Markdown (**bold**, `- lists`, `## headings`, etc.) renders formatted.
 * Callers never need to detect which case they're in.
 *
 * The renderer/sanitizeHref below were lifted from the a2ui catalog's own
 * markdown.tsx (src/modules/client/ai-hub/a2ui/catalog/markdown.tsx), which
 * has the same styling but is wired to that system's dynamic-component
 * plumbing (processor/surfaceId/resolvePrimitive) and so isn't reusable
 * outside it. This is the plain, dependency-free version for everywhere
 * else in the app — the clinical/chat surfaces this was written for don't
 * have (or need) that plumbing.
 */

"use client";

import React from "react";
import MarkedReact, { type ReactRenderer } from "marked-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strips `javascript:` links before they reach an `<a href>` — Markdown link
 * syntax is otherwise a direct injection vector for AI-generated content.
 *
 * @param href - Raw href parsed from Markdown link syntax.
 * @returns The href unchanged, or "#" if it resolves to a javascript: URL.
 */
function sanitizeHref(href: string): string {
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol === "javascript:") return "#";
    return href;
  } catch {
    return href;
  }
}

/**
 * Builds a `marked-react` renderer with this app's Markdown styling.
 *
 * @param nextKey - Returns a fresh, unique key on each call (marked-react
 *   renderer functions don't get one for free).
 */
function buildMarkdownRenderer(nextKey: () => number): Partial<ReactRenderer> {
  return {
    paragraph(children) {
      return (
        <p key={nextKey()} className="text-sm leading-7 my-1">
          {children}
        </p>
      );
    },
    heading(children, level) {
      const classes: Record<number, string> = {
        1: "text-4xl font-bold mt-4 mb-2",
        2: "text-3xl font-bold mt-4 mb-2",
        3: "text-2xl font-semibold mt-3 mb-2",
        4: "text-xl font-semibold mt-3 mb-1",
        5: "text-lg font-medium mt-2 mb-1",
        6: "text-base font-medium mt-2 mb-1",
      };
      const Tag = `h${level}` as React.ElementType;
      return (
        <Tag key={nextKey()} className={classes[level] ?? ""}>
          {children}
        </Tag>
      );
    },
    strong(children) {
      return (
        <strong key={nextKey()} className="font-semibold">
          {children}
        </strong>
      );
    },
    em(children) {
      return (
        <em key={nextKey()} className="italic">
          {children}
        </em>
      );
    },
    del(children) {
      return (
        <del key={nextKey()} className="line-through">
          {children}
        </del>
      );
    },
    blockquote(children) {
      return (
        <blockquote
          key={nextKey()}
          className="border-l-4 border-border pl-4 italic text-muted-foreground my-2"
        >
          {children}
        </blockquote>
      );
    },
    list(children, ordered) {
      return ordered ? (
        <ol key={nextKey()} className="list-decimal ml-8 my-2 text-sm">
          {children}
        </ol>
      ) : (
        <ul key={nextKey()} className="list-disc ml-8 my-2 text-sm">
          {children}
        </ul>
      );
    },
    listItem(children) {
      return (
        <li key={nextKey()} className="my-1 leading-6">
          {children}
        </li>
      );
    },
    codespan(code) {
      return (
        <code
          key={nextKey()}
          className="px-2 py-0.5 text-xs rounded-md text-purple-800 dark:text-purple-300 bg-purple-600/20 font-mono"
        >
          {code}
        </code>
      );
    },
    code(code, lang) {
      return (
        <pre
          key={nextKey()}
          className="my-3 rounded-lg bg-zinc-900 dark:bg-zinc-950 overflow-x-auto"
        >
          <code
            className={`block p-4 text-xs font-mono text-zinc-100 language-${lang ?? "text"}`}
          >
            {code}
          </code>
        </pre>
      );
    },
    link(href, text) {
      const safe = sanitizeHref(href);
      return (
        <a
          key={nextKey()}
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {text}
        </a>
      );
    },
    table(children) {
      return (
        <div key={nextKey()} className="overflow-x-auto my-3">
          <table className="w-full text-sm text-left border-collapse">
            {children}
          </table>
        </div>
      );
    },
    tableHeader(children) {
      return (
        <thead key={nextKey()} className="text-xs font-medium uppercase bg-muted/50">
          {children}
        </thead>
      );
    },
    tableBody(children) {
      return <tbody key={nextKey()}>{children}</tbody>;
    },
    tableRow(children) {
      return (
        <tr key={nextKey()} className="border-b border-border hover:bg-muted/30">
          {children}
        </tr>
      );
    },
    tableCell(children, flags) {
      return flags.header ? (
        <th key={nextKey()} className="p-3 text-sm font-medium">
          {children}
        </th>
      ) : (
        <td key={nextKey()} className="p-3 text-xs">
          {children}
        </td>
      );
    },
    hr() {
      return <hr key={nextKey()} className="my-4 border-border" />;
    },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MarkdownProps {
  /** Raw AI-generated text — Markdown or plain, either renders correctly. */
  content: string | null | undefined;
  /** Extra classes on the wrapping div (e.g. to adjust spacing in context). */
  className?: string;
}

/**
 * Renders AI-generated text through `marked-react`. Plain text renders as an
 * ordinary paragraph; text containing Markdown syntax renders formatted.
 * Renders nothing for empty/blank content, matching this app's usual
 * `{value && <Field .../>}` convention for optional AI fields.
 *
 * @param content - Raw text to render.
 * @param className - Extra classes for the wrapper div.
 */
export function Markdown({ content, className }: MarkdownProps) {
  const text = content?.trim();
  if (!text) return null;

  // Counter resets each render so keys are unique within a single render pass.
  let keyCount = 0;
  const renderer = buildMarkdownRenderer(() => keyCount++);

  return (
    <div className={cn("markdown-body max-w-none", className)}>
      <MarkedReact value={text} renderer={renderer} breaks gfm openLinksInNewTab />
    </div>
  );
}
