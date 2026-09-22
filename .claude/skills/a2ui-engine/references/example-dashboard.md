# Example: a complete analytics dashboard

A full, working example of the one file type this engine deliberately
doesn't ship — a real workflow + UI schema pair — so you have something
concrete to copy from instead of starting from the abstract format
described in `authoring-workflows.md` / `authoring-ui-schemas.md`.

**What it is**: a read-only "Identity Server Analytics" dashboard —
three KPI cards, two charts (a signups line chart, an auth-method pie
chart), and one table (recent logins). It's plumbed against four dummy
endpoints under `$backend_url/analytics/*` — point `A2UI_BACKEND_URL` at
a real API that serves the same shapes (documented per-resolver below) and
it becomes a real dashboard with no schema changes.

**Where these two files go** (see `SKILL.md`'s Step 1 roots):

| File | Destination |
|---|---|
| The workflow | `{CLIENT_ROOT}/a2ui/workflows/analytics/identity_analytics_dashboard.json`, registered in `{API_ROOT}/workflow/_registry.ts` |
| The UI schema | `{CLIENT_ROOT}/a2ui/schemas/ui/identity_analytics_dashboard.json`, registered in `{CLIENT_ROOT}/a2ui/schemas/ui/index.ts` |

## The dummy endpoints this assumes

Four `GET` endpoints, all under `$backend_url/analytics/`:

| Endpoint | Returns |
|---|---|
| `/summary` | `{ "total_users": number, "active_sessions": number, "new_signups_7d": number }` |
| `/signups?days=14` | `{ "data": [{ "date": "YYYY-MM-DD", "count": number }, ...] }` |
| `/auth-methods` | `{ "data": [{ "method": "password" \| "oauth" \| "sso", "count": number }, ...] }` |
| `/recent-logins?limit=20` | `{ "data": [{ "user": string, "method": string, "ip": string, "status": "success" \| "failed", "timestamp": "ISO 8601" }, ...] }` |

Nothing about the workflow or schema cares whether these are real or
stubbed — a Next.js route handler under `/analytics/*` returning static
JSON works exactly as well for a demo as a real analytics service does.

## The workflow

`identity_analytics_dashboard.json`:

```json
{
  "id": "identity_analytics_dashboard",
  "name": "Identity Server Analytics",
  "description": "Read-only analytics dashboard for an identity/auth server — signups, sessions, auth-method mix, and recent logins.",
  "version": "1.0.0",
  "workflow_type": "analysis",
  "tags": ["analytics", "dashboard", "example"],
  "llm_hints": {
    "intent_examples": [
      "Show identity server analytics",
      "Open the auth dashboard",
      "How many users signed up this week?"
    ],
    "when_to_use": [
      "A consolidated, read-only view of identity-server activity is wanted"
    ],
    "when_not_to_use": [
      "Managing an individual user or session — this workflow has no mutation actions"
    ],
    "required_context": []
  },
  "execution": {
    "mode": "deterministic",
    "orchestrator": "nextjs",
    "audit_enabled": false
  },
  "introduction": "Here's the identity server analytics dashboard.",
  "completion": {
    "message": "Dashboard closed.",
    "action": "dismiss"
  },
  "workflow_steps": [
    {
      "sequence_number": 1,
      "id": "identity_analytics_view",
      "name": "Identity Analytics",
      "step_type": "view",
      "description": "Shows signup trend, auth-method mix, and recent logins.",
      "context": { "inputs": {}, "outputs": {} },
      "context_resolvers": [
        {
          "context_key": "summary",
          "tool_name": "get_identity_summary",
          "url": "$backend_url/analytics/summary",
          "method": "GET",
          "timeout_ms": 8000
        },
        {
          "context_key": "signups",
          "tool_name": "list_daily_signups",
          "url": "$backend_url/analytics/signups?days=14",
          "method": "GET",
          "timeout_ms": 8000
        },
        {
          "context_key": "auth_methods",
          "tool_name": "list_auth_method_breakdown",
          "url": "$backend_url/analytics/auth-methods",
          "method": "GET",
          "timeout_ms": 8000
        },
        {
          "context_key": "recent_logins",
          "tool_name": "list_recent_logins",
          "url": "$backend_url/analytics/recent-logins?limit=20",
          "method": "GET",
          "timeout_ms": 8000
        }
      ],
      "ui": {
        "schema": "identity_analytics_dashboard",
        "mode": "view",
        "prefill": false,
        "editable": false
      }
    }
  ]
}
```

Register it:

```ts
// {API_ROOT}/workflow/_registry.ts
import identity_analytics_dashboard from "@/modules/client/a2ui/workflows/analytics/identity_analytics_dashboard.json";

export const WORKFLOW_ENTRIES: WorkflowEntry[] = [
  { category: "Analytics", workflow: identity_analytics_dashboard as unknown as WorkflowDefinition },
];
```

## The UI schema

`identity_analytics_dashboard.json` — every `$key` below resolves against
the four resolvers' `context_key`s above (`$summary.*`, `$signups.data`,
`$auth_methods.data`, `$recent_logins.data`):

```json
{
  "type": "Column",
  "id": "identity-analytics-root",
  "properties": {
    "gap": 24,
    "children": [
      {
        "type": "Row",
        "id": "identity-analytics-kpi-row",
        "properties": {
          "gap": 16,
          "children": [
            {
              "type": "DashboardCard",
              "id": "kpi-total-users-card",
              "weight": 1,
              "properties": {
                "title": "Total Users",
                "icon": "users",
                "iconColor": "#2563EB",
                "child": {
                  "type": "Metric",
                  "id": "kpi-total-users",
                  "properties": { "label": "All time", "value": "$summary.total_users" }
                }
              }
            },
            {
              "type": "DashboardCard",
              "id": "kpi-active-sessions-card",
              "weight": 1,
              "properties": {
                "title": "Active Sessions",
                "icon": "activity",
                "iconColor": "#16A34A",
                "child": {
                  "type": "Metric",
                  "id": "kpi-active-sessions",
                  "properties": { "label": "Right now", "value": "$summary.active_sessions" }
                }
              }
            },
            {
              "type": "DashboardCard",
              "id": "kpi-new-signups-card",
              "weight": 1,
              "properties": {
                "title": "New Signups",
                "icon": "user-plus",
                "iconColor": "#B45309",
                "child": {
                  "type": "Metric",
                  "id": "kpi-new-signups",
                  "properties": { "label": "Last 7 days", "value": "$summary.new_signups_7d" }
                }
              }
            }
          ]
        }
      },
      {
        "type": "Row",
        "id": "identity-analytics-charts-row",
        "properties": {
          "gap": 16,
          "children": [
            {
              "type": "DashboardCard",
              "id": "signups-chart-card",
              "weight": 1,
              "properties": {
                "title": "Daily Signups (last 14 days)",
                "child": {
                  "type": "LineChart",
                  "id": "signups-chart",
                  "properties": {
                    "data": {
                      "$transform": {
                        "from": "$signups.data",
                        "type": "chain",
                        "steps": [
                          { "type": "slice", "sort": "date", "order": "asc" },
                          { "type": "map", "fields": { "label": "date", "signups": "count" } }
                        ]
                      }
                    },
                    "series": [{ "key": "signups", "name": "Signups", "color": "#2563EB" }],
                    "xKey": "label",
                    "height": 260,
                    "showGrid": true,
                    "exportable": true
                  }
                }
              }
            },
            {
              "type": "DashboardCard",
              "id": "auth-methods-chart-card",
              "weight": 1,
              "properties": {
                "title": "Sign-in Method Breakdown",
                "child": {
                  "type": "PieChart",
                  "id": "auth-methods-chart",
                  "properties": {
                    "data": {
                      "$transform": {
                        "from": "$auth_methods.data",
                        "type": "map",
                        "fields": { "label": "method", "value": "count" }
                      }
                    },
                    "height": 260,
                    "showLegend": true,
                    "exportable": true
                  }
                }
              }
            }
          ]
        }
      },
      {
        "type": "DashboardCard",
        "id": "recent-logins-card",
        "properties": {
          "title": "Recent Logins",
          "child": {
            "type": "DataTable",
            "id": "recent-logins-table",
            "properties": {
              "rows": {
                "$transform": {
                  "from": "$recent_logins.data",
                  "type": "map",
                  "fields": {
                    "user": "user",
                    "method": "method",
                    "ip": "ip",
                    "status": "status",
                    "timestamp": "timestamp"
                  }
                }
              },
              "columns": [
                { "key": "user", "label": "User" },
                { "key": "method", "label": "Method" },
                { "key": "ip", "label": "IP Address" },
                { "key": "status", "label": "Status" },
                { "key": "timestamp", "label": "Time" }
              ],
              "searchable": true,
              "searchPlaceholder": "Search logins...",
              "exportFormats": ["csv", "json"]
            }
          }
        }
      }
    ]
  }
}
```

Register it:

```ts
// {CLIENT_ROOT}/a2ui/schemas/ui/index.ts
import identity_analytics_dashboard from "./identity_analytics_dashboard.json";

export const UI_SCHEMA_REGISTRY: Record<string, unknown> = {
  identity_analytics_dashboard,
};
```

## Trying it without a real backend

Stub the four endpoints as static Next.js route handlers so the dashboard
renders with real-looking data immediately — none of this is part of the
engine, it's just a fast way to see the workflow above actually run:

```ts
// src/app/analytics/summary/route.ts  (point A2UI_BACKEND_URL at /analytics for this to be hit)
export async function GET() {
  return Response.json({ total_users: 4821, active_sessions: 132, new_signups_7d: 96 });
}
```

```ts
// src/app/analytics/signups/route.ts
export async function GET() {
  const data = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { date: d.toISOString().slice(0, 10), count: 5 + Math.round(Math.random() * 20) };
  });
  return Response.json({ data });
}
```

```ts
// src/app/analytics/auth-methods/route.ts
export async function GET() {
  return Response.json({
    data: [
      { method: "password", count: 2210 },
      { method: "oauth", count: 1840 },
      { method: "sso", count: 771 },
    ],
  });
}
```

```ts
// src/app/analytics/recent-logins/route.ts
export async function GET() {
  const data = Array.from({ length: 20 }, (_, i) => ({
    user: `user${i + 1}@example.com`,
    method: ["password", "oauth", "sso"][i % 3],
    ip: `10.0.${i}.${(i * 7) % 255}`,
    status: i % 6 === 0 ? "failed" : "success",
    timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
  }));
  return Response.json({ data });
}
```

With `A2UI_BACKEND_URL=http://localhost:3000` (adjust the port — no
`/analytics` suffix, since the resolver URLs above already include it:
`$backend_url/analytics/summary` etc.), the workflow's four resolvers hit
these route handlers directly.
