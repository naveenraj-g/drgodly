/**
 * workflow.queries — TanStack Query keys and hooks for the workflow endpoints.
 *
 * Layer: client / a2ui / queries
 *
 * Hooks:
 *   usePermittedWorkflows — fetches GET /api/workflow/permitted and returns the
 *                           list of workflows the current user is allowed to run,
 *                           filtered server-side by the user's session permissions
 *                           and, optionally, by launcher surface (workflow_type).
 *
 * The permitted list is derived from the user's session so it only changes on
 * login / permission update — staleTime is set to 5 minutes to avoid redundant
 * round-trips when the user switches tabs or re-opens the Workflows panel.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { PermittedWorkflow } from "@/app/api/workflow/permitted/route";

/** Launcher surface filter — see WorkflowDefinition.workflow_type. */
export type WorkflowTypeFilter = "chat" | "analysis";

// ── Query key factory ──────────────────────────────────────────────────────────

/**
 * Centralised query key factory for workflow endpoints.
 * Keeps cache invalidation predictable across the chat module.
 */
export const workflowKeys = {
  /** Base key — invalidates all workflow queries. */
  all: ["workflow"] as const,
  /** Key for the permission-filtered workflow list, optionally scoped by type. */
  permitted: (type?: WorkflowTypeFilter) =>
    [...workflowKeys.all, "permitted", type ?? "all"] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches the list of workflows the current session user is permitted to run.
 * Throws on non-OK responses so TanStack Query can handle retries.
 *
 * @param type - Optional launcher-surface filter forwarded as ?type=.
 * @returns Array of permitted workflow metadata.
 * @throws Error with HTTP status when the request fails.
 */
async function fetchPermittedWorkflows(
  type?: WorkflowTypeFilter,
): Promise<PermittedWorkflow[]> {
  const url = type ? `/api/workflow/permitted?type=${type}` : "/api/workflow/permitted";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load permitted workflows (${res.status})`);
  }
  const data = await res.json();
  return data.workflows ?? [];
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Returns the list of workflows the authenticated user is allowed to run,
 * matched against their session permissions on the server and, optionally,
 * scoped to one launcher surface.
 *
 * Caching behaviour:
 *   staleTime — 5 minutes: permissions don't change during a normal session.
 *   gcTime    — inherits the global 5-minute default from QueryProvider.
 *   retry     — inherits the global 1-retry default from QueryProvider.
 *
 * @param type - Optional launcher-surface filter — "chat" or "analysis".
 * @returns TanStack Query result containing `data: PermittedWorkflow[] | undefined`.
 */
export function usePermittedWorkflows(type?: WorkflowTypeFilter) {
  return useQuery({
    queryKey: workflowKeys.permitted(type),
    queryFn: () => fetchPermittedWorkflows(type),
    staleTime: 5 * 60_000,
  });
}
