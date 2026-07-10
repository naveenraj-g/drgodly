/**
 * Workflow type definitions.
 *
 * Layer: types
 *
 * Shared interfaces for the AI-hub workflow system. Used by the API routes
 * (workflow, step, submit, terminology) and the client-side A2UI components.
 */

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  tags?: string[];
  /**
   * Permission strings the caller must hold in session.session.permissions[]
   * for this workflow to be accessible. An empty array or absent field means
   * any authenticated user may run the workflow.
   */
  required_permissions?: string[];
  llm_hints?: {
    intent_examples?: string[];
    when_to_use?: string[];
    when_not_to_use?: string[];
    required_context?: string[];
  };
  execution?: {
    mode: string;
    orchestrator: string;
    retryable?: boolean;
    audit_enabled: boolean;
  };
  introduction?: string;
  completion?: {
    message: string;
    action?: "dismiss";
  };
  workflow_steps: WorkflowStepDefinition[];
}

export interface ContextResolverDef {
  description?: string;
  context_key?: string;
  tool_name: string;
  url: string;
  method: "GET" | "POST";
  timeout_ms?: number;
}

export interface WorkflowStepDefinition {
  sequence_number: number;
  id: string;
  name: string;
  step_type: "form" | "view" | "confirm" | "context";
  optional?: boolean;
  description: string;
  /**
   * Session context key whose value must be truthy for this step to be shown.
   * If the value is falsy the step/route.ts skips over it automatically.
   * Absent means the step is always shown.
   */
  skip_unless?: string;
  context?: {
    inputs: Record<string, StepContextInput>;
    outputs: Record<string, StepContextOutput>;
    /**
     * Keys from `outputs` that must be non-null after extractOutputs runs.
     * If any listed key is absent the submit route returns an error using the
     * output spec's `error_message` field.
     */
    required_outputs?: string[];
  };
  /** Single resolver — kept for backward compatibility. */
  context_resolver?: ContextResolverDef;
  /** Multiple resolvers executed in parallel; results are merged into stepData. */
  context_resolvers?: ContextResolverDef[];
  ui?: {
    schema: string;
    mode?: "create" | "edit" | "view" | "append";
    prefill?: boolean;
    editable?: boolean;
    submit_label?: string;
  };
  actions?: WorkflowAction[];
}

export interface StepContextInput {
  type: string;
  resource?: string;
  source?: string;
}

export interface StepContextOutput {
  type: string;
  resource?: string;
  field?: string;
  /**
   * Error message returned to the client when this output is listed in
   * `context.required_outputs` but is missing from the extracted data.
   */
  error_message?: string;
}

export interface WorkflowAction {
  type: "http" | "navigate";
  purpose: string;
  tool_name: string;
  /** Required for type "http". Absent for type "navigate". */
  url?: string;
  /** Required for type "http". Absent for type "navigate". */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  validation_schema?: string;
  iterate_key?: string;
  retryable: boolean;
  timeout_ms?: number;
  /**
   * Zero-based step index to jump to. Only used when type is "navigate".
   * The step route's skip_unless loop still applies from that index.
   */
  target_step_index?: number;
}
