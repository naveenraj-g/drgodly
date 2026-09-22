# Authoring a UI schema

A UI schema is a JSON tree of component nodes (see `component-catalog.md`
for every available `type`), registered under a string key in
`UI_SCHEMA_REGISTRY` (`client/schemas/ui/index.ts`) and referenced from a
workflow step's `ui.schema` field, or rendered standalone via
`client/a2ui/components/UISchemaPreview.tsx`. This engine ships the
registry **empty** — the schemas themselves are specific to your
application. This doc explains the format so you can write your own.

## Basic structure

Every node is `{ id, type, properties, weight? }` — `id` is required and
must be unique within the schema (component instances key their live state
off it); `weight` is optional and sets flex sizing when the node sits inside
a `Row`/`Column`. Layout nodes nest children *inside* `properties`, not at
the node's top level: `Row`/`Column`/`Form` take `properties.children`
(an array), `Card`/`DashboardCard` take `properties.child` (singular, one
nested node). Every other prop is type-specific and also lives under
`properties` (e.g. `Metric.properties.value`).

```json
{
  "type": "Card",
  "id": "order-summary-card",
  "properties": {
    "child": {
      "type": "Column",
      "id": "order-summary-body",
      "properties": {
        "gap": 12,
        "children": [
          {
            "type": "Metric",
            "id": "order-total-metric",
            "properties": { "label": "Order total", "value": "$order.total" }
          },
          {
            "type": "LineChart",
            "id": "order-items-chart",
            "properties": {
              "data": { "$transform": {
                "from": "$order.line_items",
                "type": "chain",
                "steps": [
                  { "type": "filter", "field": "quantity", "op": "notNull" },
                  { "type": "map", "fields": { "label": "date", "qty": "quantity" } }
                ]
              }},
              "series": [{ "key": "qty", "name": "Quantity", "color": "#2563EB" }],
              "xKey": "label"
            }
          }
        ]
      }
    }
  }
}
```

See `references/example-dashboard.md` for a complete, working schema (two
charts + a table) built exactly this way, alongside the workflow that feeds
it.

## Variable substitution (`$variable`)

Any string value of the form `"$key"` or `"$key.nested.path"` is resolved
against the merged `stepData`/`sessionContext` object by
`mapUiSchemaDataV3.parseUI` before the component tree is rendered — by the
time a catalog component sees its props, there are no `"$..."` strings left,
only real values. Use dot paths to reach into nested resolver results
(`"$customer.name.given"`).

## The `$transform` DSL

Chart/table/metric data almost always needs reshaping from whatever a
resolver returned into the flat `{label, value}`-style arrays those
components expect. Rather than writing a custom resolver per shape, put a
`{ "$transform": {...} }` object anywhere a prop expects data — it's
resolved by `applyTransform` (`client/a2ui/utils/transform.ts`) as part of
the same pass that resolves `$variable` strings.

Operators (`type` field of the spec):

| `type` | Use it for |
|---|---|
| `map` | Rename/pick/format fields per record — `{ fields: { label: "date", qty: "quantity" } }` |
| `pivot` | Collapse one record's multiple fields into `[{label, value}]` — e.g. a spend breakdown for a pie chart |
| `aggregate` | Collapse an array into one record, or grouped records with `groupBy` (sum/avg/min/max/count/first/last) |
| `slice` | Sort + take a window (`sort`, `order`, `limit`) |
| `filter` | Keep records matching a field/op/value predicate |
| `extract` | Pull a single scalar out (e.g. `last` value for a KPI) |
| `pluck` | Pull one field out of every record into a flat array |
| `chain` | Run a list of the above `steps` in sequence — the usual way to compose more than one operator |

Read the full spec docs and examples at the top of
`client/a2ui/utils/transform.ts` for every operator's exact options — it's
short and thoroughly commented, worth reading in full before writing a
nontrivial schema.

## Form schemas

A `Form` node wraps input nodes (`TextField`, `DatePicker`, `MultipleChoice`,
`DynamicSelect`, `RepeatableGroup`, etc.) and collects their values keyed by
each field's `name` prop into an object matching the step's
`context.outputs`/the action's `validation_schema`. Set the step's
`ui.mode` (`"create" | "edit" | "view" | "append"`) to control whether
fields start blank, pre-filled from `stepData` (`prefill: true`), or
read-only.

## Registering a schema

```ts
// {CLIENT_ROOT}/a2ui/schemas/ui/index.ts
import order_summary_card from "@/modules/client/a2ui/schemas/ui/order_summary_card.json";

export const UI_SCHEMA_REGISTRY: Record<string, unknown> = {
  order_summary_card,
};
```

Prefer one JSON file per schema under
`{CLIENT_ROOT}/a2ui/schemas/ui/*.json`, imported and added to the
registry — keeps each schema reviewable on its own and matches how
`UISchemaPreview.tsx` groups/lists them.
