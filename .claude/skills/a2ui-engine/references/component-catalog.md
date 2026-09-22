# Catalog component reference

Every UI schema tree is made of nodes with a `type` string. `rendering/catalog.ts`
(`DEFAULT_CATALOG`) maps each `type` to the React component that renders it, and
`rendering/renderer.tsx` walks the tree dispatching to that map. This is the
full list of registered types after this skill is applied — use it when writing
UI schemas (see `authoring-ui-schemas.md`) so you reference real, working types.

| `type` | Component file | What it renders |
|---|---|---|
| `Text` | `catalog/text.tsx` | Styled text/paragraph |
| `Row` | `catalog/row.tsx` | Horizontal flex layout container |
| `Column` | `catalog/column.tsx` | Vertical flex layout container |
| `Image` | `catalog/image.tsx` | `<img>` with sizing props |
| `Icon` | `catalog/icon.tsx` | Lucide icon by name (via `DynamicLucideIcon`) |
| `Button` | `catalog/button.tsx` | Action button, dispatches a workflow action |
| `Card` | `catalog/card.tsx` | Bordered container with optional header |
| `Tabs` | `catalog/tabs.tsx` | Tabbed panel switcher |
| `Modal` | `catalog/modal.tsx` | Dialog overlay |
| `CheckBox` | `catalog/checkbox.tsx` | Boolean form field |
| `TextField` | `catalog/text-field.tsx` | Single/multiline text input |
| `DateTimeInput` | `catalog/datetime-input.tsx` | Date + time picker input |
| `DatePicker` | `catalog/DatePicker.tsx` | Date-only picker |
| `Slider` | `catalog/slider.tsx` | Numeric range input |
| `MultipleChoice` | `catalog/multiple-choice.tsx` | Single/multi-select choice list |
| `List` | `catalog/list.tsx` | Generic list of items |
| `Divider` | `catalog/divider.tsx` | Horizontal rule |
| `Video` | `catalog/video.tsx` | `<video>` player |
| `AudioPlayer` | `catalog/audio-player.tsx` | `<audio>` player |
| `Table` | `catalog/table.tsx` | Simple static table |
| `Form` | `catalog/form.tsx` | Form wrapper that collects child field values and submits |
| `Switch` | `catalog/switch.tsx` | Boolean toggle |
| `RadioGroup` | `catalog/radio-group.tsx` | Single-choice radio list |
| `Badge` | `catalog/badge.tsx` | Small status/label pill |
| `Avatar` | `catalog/avatar.tsx` | User/entity avatar image or initials |
| `Alert` | `catalog/alert.tsx` | Inline warning/info/error banner |
| `Progress` | `catalog/progress.tsx` | Progress bar |
| `Spinner` | `catalog/spinner.tsx` | Loading indicator |
| `Accordion` | `catalog/accordion.tsx` | Expand/collapse sections |
| `Breadcrumb` | `catalog/breadcrumb.tsx` | Breadcrumb trail |
| `SearchField` | `catalog/search-field.tsx` | Search input with icon |
| `Link` | `catalog/link.tsx` | Hyperlink / navigation action |
| `Separator` | `catalog/separator.tsx` | Visual divider |
| `Markdown` | `catalog/markdown.tsx` | Renders a markdown string |
| `BarChart` | `catalog/bar-chart.tsx` | Recharts bar chart |
| `LineChart` | `catalog/line-chart.tsx` | Recharts line chart |
| `AreaChart` | `catalog/area-chart.tsx` | Recharts area chart |
| `PieChart` | `catalog/pie-chart.tsx` | Recharts pie/donut chart |
| `RadialBarChart` | `catalog/radial-bar-chart.tsx` | Recharts radial bar chart |
| `ComposedChart` | `catalog/composed-chart.tsx` | Recharts multi-series composed chart |
| `DashboardCard` | `catalog/dashboard-card.tsx` | KPI card with icon + value + trend |
| `Metric` | `catalog/metric.tsx` | Bare KPI value + label |
| `DataTable` | `catalog/data-table.tsx` | Paginated/sortable data table (TanStack-backed) |
| `RepeatableGroup` | `catalog/repeatable-group.tsx` | Add/remove repeated groups of fields |
| `DataSelect` | `catalog/data-select.tsx` | Select populated from static/context data |
| `DynamicSelect` | `catalog/dynamic-select.tsx` | Select whose options are fetched server-side |
| `SlotPicker` | `catalog/slot-picker.tsx` | Appointment/time-slot picker |

Two files exist but are **not wired into `DEFAULT_CATALOG`** (this matches the
source app exactly — not a bug introduced by this skill):

- `catalog/chart.tsx` (type `"Chart"` in `types/index.ts` and `prompt.ts`) — a
  generic Vega-Lite escape hatch for chart shapes the typed Recharts
  components don't cover. Register it yourself if you need it:
  `import Chart from "../catalog/chart"; DEFAULT_CATALOG.Chart = { component: Chart };`
  Requires `vega`, `vega-lite`, and `vega-embed`.
- `catalog/chart-empty-state.tsx` — not a catalog type at all, it's a shared
  "no data" placeholder imported directly by the six Recharts components.
