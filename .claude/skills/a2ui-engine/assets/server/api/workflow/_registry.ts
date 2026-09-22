/**
 * Workflow registry — central catalogue of all registered workflow definitions.
 *
 * Layer: app / api / workflow
 *
 * This is the single source of truth for every workflow in the system. All
 * routes that need to resolve a workflow by ID (POST /api/workflow with
 * workflow_id) or build a permission-filtered list (GET /api/workflow/permitted)
 * import from here instead of maintaining their own import lists.
 *
 * Ships EMPTY on purpose — this skill scaffolds the *engine*, not any
 * specific workflow. Author your own workflow_steps JSON (see
 * ../../../references/authoring-workflows.md), give it a matching UI schema
 * entry in modules/client/a2ui/schemas/ui, then register it here:
 *
 *   import my_workflow from "@/modules/client/a2ui/workflows/my_workflow.json";
 *
 *   export const WORKFLOW_ENTRIES: WorkflowEntry[] = [
 *     { category: "My Category", workflow: my_workflow as unknown as WorkflowDefinition },
 *   ];
 *
 * Each entry wraps a WorkflowDefinition with a human-readable category label
 * used by the launcher UI to group workflow cards — it is not stored in the
 * workflow JSON itself.
 */

import type { WorkflowDefinition } from "@/types/workflow";

export interface WorkflowEntry {
  workflow: WorkflowDefinition;
  /** Human-readable category label shown as a group heading in the launcher. */
  category: string;
}

/** Add your own workflow entries here — see the file header for the pattern. */
export const WORKFLOW_ENTRIES: WorkflowEntry[] = [];

/**
 * O(1) lookup map from workflow.id → WorkflowEntry.
 * Used by POST /api/workflow when a workflow_id is provided directly.
 */
export const WORKFLOW_REGISTRY = new Map<string, WorkflowEntry>(
  WORKFLOW_ENTRIES.map((entry) => [entry.workflow.id, entry]),
);
