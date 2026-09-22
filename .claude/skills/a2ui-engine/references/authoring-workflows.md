# Authoring a workflow

A workflow is a JSON file matching `WorkflowDefinition` (generated to
`{TYPES_ROOT}/workflow.ts`) — a sequence of steps the server walks one
at a time, fetching data (`context` steps / `context_resolver(s)`) and
presenting UI (`ui.schema`, a key into `UI_SCHEMA_REGISTRY`) for the client to
render and submit back (`actions[]`). This engine ships **without** any real
workflow JSON — that's the part specific to your application. This doc is
the map for writing your own.

## Minimal shape

```json
{
  "id": "book_appointment",
  "name": "Book an appointment",
  "description": "Collects appointment details and creates it.",
  "version": "1.0.0",
  "workflow_type": "chat",
  "workflow_steps": [
    {
      "sequence_number": 0,
      "id": "select_slot",
      "name": "Choose a time",
      "step_type": "form",
      "description": "Pick an available slot.",
      "context_resolver": {
        "tool_name": "list_available_slots",
        "url": "$backend_url/slots?practitioner_id=$practitioner_id",
        "method": "GET"
      },
      "ui": { "schema": "slot_picker_form", "mode": "create", "submit_label": "Continue" },
      "actions": [
        {
          "type": "navigate",
          "purpose": "advance",
          "tool_name": "advance",
          "target_step_index": 1,
          "retryable": false
        }
      ]
    },
    {
      "sequence_number": 1,
      "id": "confirm",
      "name": "Confirm booking",
      "step_type": "confirm",
      "description": "Creates the appointment.",
      "ui": { "schema": "appointment_confirm_view", "mode": "view" },
      "actions": [
        {
          "type": "http",
          "purpose": "create_appointment",
          "tool_name": "create_appointment",
          "url": "$backend_url/appointments",
          "method": "POST",
          "retryable": true
        }
      ]
    }
  ]
}
```

## Step types

- **`context`** — pure data-fetch, no UI. Use when you need to pull data
  into session context before a later step can render (e.g. loading customer
  info before showing a form pre-filled with it).
- **`form`** — renders `ui.schema` (typically containing `Form`/`TextField`/etc.
  nodes), collects field values, runs the step's `actions` on submit.
- **`view`** — renders `ui.schema` read-only (e.g. a chart/table/summary),
  advances via a `navigate` action.
- **`confirm`** — a view step that ends in a side-effecting action (create/
  update/delete) rather than just advancing.

## Context resolution

`context_resolver` (single) or `context_resolvers` (array, run in parallel,
results merged) fetch data before the step renders. Two transports:

- `"http"` (default) — `url` + `method`. `url` can interpolate session
  context values with `$key` (see `resolveUrl` in `{API_ROOT}/workflow/_lib.ts`).
  `$backend_url` is always available — it's auto-seeded from
  `A2UI_BACKEND_URL` on every request, so every resolver/action URL starts
  with `$backend_url/...` rather than a hardcoded host.
- `"graphql"` — `graphql_document` (a key into `GRAPHQL_DOCUMENTS`,
  `{CLIENT_ROOT}/a2ui/schemas/graphql/index.ts`) + `graphql_variables`/
  `graphql_input_fields` to map session-context keys onto GraphQL variables.

Every resolver's result is merged into `stepData`, which `mapUiSchemaDataV3`
uses to resolve `"$variable"` references in the step's UI schema.

## Actions

Run when a `form`/`confirm` step is submitted, or a `Button`/`navigate`
node is clicked in a `view` step. `type` is one of:

- `"http"` — `url` + `method`, optional `validation_schema` (a key into
  `VALIDATION_SCHEMAS`, `{CLIENT_ROOT}/a2ui/schemas/validation/index.ts`) to
  validate the submitted form data before sending.
- `"graphql"` — same idea via `graphql_document`.
- `"navigate"` — client-side only, jumps to `target_step_index`. No network
  call.

`iterate_key` on an action repeats it once per item in an array field (e.g.
submitting N line items individually). `retryable: true` lets the client
retry a failed action without re-running the whole step.

## Conditional steps

`skip_unless: "some_context_key"` skips the step automatically (handled by
`{API_ROOT}/workflow/step/route.ts`) when that session-context key is falsy
— e.g. skip an "insurance details" step unless `has_insurance` was set true
by an earlier step's extracted output.

## Registering a workflow

Add an entry to `{API_ROOT}/workflow/_registry.ts`'s `WORKFLOW_ENTRIES`:

```ts
import book_appointment from "@/modules/client/a2ui/workflows/book_appointment.json";

export const WORKFLOW_ENTRIES: WorkflowEntry[] = [
  { category: "Appointments", workflow: book_appointment as unknown as WorkflowDefinition },
];
```

`category` is a human-readable group label the launcher UI uses to group
workflow cards — it's not part of the workflow JSON itself.

That's the one file this skill leaves as an empty scaffold — everything else
(the routes that walk `WORKFLOW_REGISTRY`, resolve context, run actions) is
already wired up and workflow-agnostic.
