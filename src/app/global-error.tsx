/**
 * Root-layout error boundary.
 *
 * Layer: app / pages
 *
 * Last-resort fallback for crashes in [locale]/layout.tsx itself — the only
 * layout above this app's real root, since routing here is rooted at a
 * dynamic [locale] segment rather than a plain app/layout.tsx. Because it
 * replaces the root layout when active, it must define its own <html> and
 * <body> and cannot rely on next-intl, providers, or any context the crashed
 * layout would normally supply — hence plain <a> links and inline styling
 * instead of the app's usual components.
 *
 * Must be a Client Component — error boundaries only work client-side.
 */

"use client";

import { useEffect } from "react";

/**
 * Renders when [locale]/layout.tsx itself throws — every other error.tsx in
 * the app sits below that layout and can't catch a failure in it.
 *
 * @param error - The thrown error, with an optional `digest` matching server logs.
 * @param unstable_retry - Re-renders the failed segment without a full reload.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global] Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          textAlign: "center",
          padding: "1rem",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: "#1a1a1a",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              maxWidth: "24rem",
              margin: 0,
            }}
          >
            DrGodly hit an unexpected error and couldn&apos;t load.
            {error.digest && (
              <>
                <br />
                Error reference: {error.digest}
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
          {/* Plain <a>, not next/link's Link — this page replaces the root
              layout entirely, so a hard navigation is the only reliable way
              home if the crash left routing context itself broken. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "#102f2a",
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Go Home
          </a>
        </div>
      </body>
    </html>
  );
}
