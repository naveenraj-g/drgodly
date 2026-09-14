/**
 * CodeBlock.tsx — pretty-printed JSON/code display for the mobile-guide docs.
 *
 * Layer: client / docs / components
 *
 * Deliberately no syntax-highlighting library — this project has no such
 * dependency yet, and one line of monospace + JSON.stringify is enough for a
 * reference doc's request/response examples.
 */

/**
 * Renders a value as pretty-printed JSON, or a raw string as-is (for URLs,
 * shell snippets, etc. that shouldn't be JSON.stringify'd).
 *
 * @param value - A JSON-serializable value, or a pre-formatted string.
 * @param label - Optional small caption above the block (e.g. "Request body").
 */
export function CodeBlock({ value, label }: { value: unknown; label?: string }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
        <code className="font-mono">{text}</code>
      </pre>
    </div>
  );
}
