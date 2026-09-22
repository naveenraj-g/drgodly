---
name: a2ui-engine
description: Scaffolds the complete A2UI engine — a server-driven UI system where a backend workflow resolves data and returns a UI-schema tree that a client renderer turns into real React components (forms, charts, tables, dashboards) inside a chat-style container — into any Next.js App Router + TypeScript project. Use this whenever the user wants to add a declarative/server-driven UI system, an AI-guided multi-step form/workflow chat, a component catalog driven by JSON schemas, or explicitly mentions "A2UI", "agent-to-UI", or porting this project's chat/workflow engine into a new codebase. Generates the full client rendering engine (~48 catalog components), the full server workflow-orchestration API, and the chat/session UI — adapted to the target project's own folder structure — but NOT any actual workflow definitions or UI schemas, since those are specific to each application. Auth and backend URLs are fully pluggable via env vars.
---

# A2UI engine scaffolder

A2UI is a declarative, server-driven UI system: a workflow JSON definition
describes a sequence of steps; the server resolves data for each step
(REST or GraphQL) and returns a UI-schema JSON tree; a client renderer walks
that tree and dispatches each node to a registered React component — forms,
charts, tables, KPI cards — inside a chat-style container. The whole point is
that adding a new screen/flow means writing JSON, not new React components.

This skill generates the **engine** — the renderer, the ~48-component
catalog, the `$transform` data-reshaping DSL, the workflow-orchestration API
routes, the chat/session UI — into the target project. It deliberately does
**not** include any actual workflow (`workflows/*.json`) or UI schema
(`schemas/ui/*.json`) content: those encode one specific application's forms
and business logic. After this skill runs, the target project has a fully
wired, working, workflow-agnostic engine with an empty workflow registry —
see `references/authoring-workflows.md` and `references/authoring-ui-schemas.md`
for how to add real ones.

**This is a generation skill, not a file-copy skill.** `assets/` holds the
engine's real, working source — the canonical spec for what each file needs
to contain — but you never `cp` it verbatim. For every file: read it from
`assets/`, then write it into the target project at the path implied by
Step 1's folder-structure roots, rewriting the small set of import prefixes
listed there to match. With the default roots (matching this project's own
conventions) the written output is byte-identical to the source; with custom
roots, every cross-file import is rewritten to match, so the generated code
reads as native to that project rather than obviously transplanted.

## Before you start: gather three answers

Ask the user (don't guess):

1. **Backend URL(s)** — what REST/GraphQL API will workflow context
   resolvers and actions call? This becomes `A2UI_BACKEND_URL` (and
   optionally `A2UI_GRAPHQL_URL` if GraphQL resolvers are used).
2. **Auth** — does this project need real authentication on the workflow
   routes, or is `A2UI_AUTH_MODE=none` (no auth, works immediately) fine for
   now? If real auth is wanted, do they have a cookie-session-based provider
   already (Better Auth, Auth.js, custom)? See `references/auth-jwt-example.md`.
3. **Persistence** — is the default in-memory session store (resets on
   restart, zero setup) fine, or is there a database (Prisma?) to wire up
   immediately? See `references/persistence-prisma-example.md`.

Don't block on these — `A2UI_AUTH_MODE=none` and the in-memory store are
safe, working defaults. Confirm the backend URL at minimum since every
resolver/action needs somewhere to point.

## Prerequisites

The target project **must** be:

- **Next.js, App Router, TypeScript.** The engine is written against App
  Router route handlers (`src/app/api/**/route.ts`) and server components —
  it does not target the Pages Router.
- **shadcn/ui initialized** (`src/lib/utils.ts` exporting `cn`, a
  `components.json`). If it isn't set up yet, run `npx shadcn@latest init`
  first — every catalog component is built on shadcn primitives.
- **TanStack Query (`@tanstack/react-query`) installed, with a
  `QueryClientProvider` wrapping the app.** The chat/session UI and the
  workflow launcher both use `useQuery` — without a provider above them in
  the tree they throw `No QueryClient set` at render time, not at build
  time, so this is easy to miss until you actually load the page.
- **The root layout (or wherever the chat page mounts) wraps its children in
  both `QueryClientProvider` and shadcn's `TooltipProvider`.** Same failure
  mode as above (`Tooltip must be used within TooltipProvider`) if skipped.
  Step 6 below has the exact provider code to drop in if the target project
  doesn't already have these wired up.

## Step 1 — configure the project's folder structure

Every asset file's target path and cross-file imports are driven by four
named roots. Ask the user whether the defaults fit their project, or whether
they follow a different convention (many projects do — mirror whatever they
already use, the same way you would when hand-writing a new feature into
their codebase):

| Root | Default path | Default import alias | Used for |
|---|---|---|---|
| `CLIENT_ROOT` | `src/modules/client` | `@/modules/client` | The whole `a2ui/` engine tree, plus `shared/components/DynamicLucideIcon.tsx` |
| `SERVER_ROOT` | `src/lib` | `@/lib` | `a2ui/` server internals (auth, session store, session actions) |
| `TYPES_ROOT` | `src/types` | `@/types` | `workflow.ts` |
| `API_ROOT` | `src/app/api` | *(route paths, not imports)* | The `/api/workflow/*` and `/api/data-fetch` route handlers |

If the project uses `src/features/`, `src/server/`, a `~/` alias, or
anything else, set the roots to match — don't force drgodly's own layout
onto a project that doesn't use it. Record the four choices; every path and
import in the steps below is written relative to them.

## Step 2 — install npm dependencies

```
npm install recharts@^3 zod@^4 zsa@^0.6 zustand@^5 @tanstack/react-query@^5 "@tanstack/react-table@^8" lucide-react@^1 date-fns@^4 graphql-request@^7 marked-react@^4 lodash@^4 @types/lodash@^4 xlsx@^0.18 jspdf@^4 jspdf-autotable@^5 html-to-image@^1
```

**Pin `@tanstack/react-table` to `^8` explicitly** — `data-table.tsx` is
written against its v8 API (`getCoreRowModel`, `getSortedRowModel`, etc.).
v9 renamed these exports and will fail to compile; installing it
unversioned pulls v9 by default.

`xlsx`/`jspdf`/`jspdf-autotable`/`html-to-image` back the export menu every
chart component and `DataTable` mount (`a2ui/utils/export.ts`) — not
optional, every chart's "export" button needs them.

Only needed if registering `catalog/chart.tsx` (the generic Vega-Lite escape
hatch, unregistered by default — see `references/component-catalog.md`):
`vega-lite@^6 vega-embed@^7`. Nothing else imports these.

## Step 3 — install shadcn/ui components

```
npx shadcn@latest add accordion alert avatar badge breadcrumb button calendar card chart checkbox collapsible command dialog input label popover progress radio-group scroll-area select separator sheet skeleton slider switch table tabs textarea tooltip
```

## Step 4 — generate the files

For each row below: read every file under the source path from this skill's
`assets/`, and write it to the destination — substituting Step 1's roots
into both the destination path and into any import in the file that starts
with one of the default aliases (`@/modules/client/...`, `@/lib/...`,
`@/types/...`). With default roots this substitution is a no-op; don't skip
writing the files just because the defaults match — still read and write
each one, since that's what lets custom roots work correctly next time.

**Client — A2UI engine** (source `assets/client/a2ui/`, destination
`{CLIENT_ROOT}/a2ui/`, whole tree, structure preserved exactly —
`catalog/`, `components/` including its `components/chat/` subfolder,
`hooks/`, `queries/`, `rendering/`, `schemas/{graphql,ui,validation}/`,
`store/`, `stores/`, `types/`, `utils/`, `prompt.ts`, `theme.ts`).

**Client — shared helper**: `assets/client/shared/DynamicLucideIcon.tsx` →
`{CLIENT_ROOT}/shared/components/DynamicLucideIcon.tsx` (note: lands under a
`components/` subfolder of `CLIENT_ROOT/shared/`, not directly under
`CLIENT_ROOT/shared/`).

**Server — A2UI internals**: `assets/server/a2ui/` (whole dir: `auth.ts`,
`checkWorkflowPermission.ts`, `session-store.ts`, `memory-session-store.ts`,
`session-actions.ts`, `store.ts`) → `{SERVER_ROOT}/a2ui/`.

**Types**: `assets/server/types/workflow.ts` → `{TYPES_ROOT}/workflow.ts`.

**API routes**: `assets/server/api/` (whole dir: `data-fetch/route.ts`,
`workflow/{route.ts,_lib.ts,_registry.ts}`, `workflow/{step,submit,
dynamic-select,permitted}/route.ts`) → `{API_ROOT}/`.

## Step 5 — set environment variables

Always required (or the engine has no idea where to send workflow
resolvers/actions):

```
A2UI_BACKEND_URL=https://your-api.example.com
```

Optional, only if used by resolvers/actions in the workflows the user
authors later:

```
A2UI_GRAPHQL_URL=https://your-graphql-endpoint.example.com/graphql
A2UI_AGENT_URL=https://your-agent-service.example.com
```

Auth (defaults to no auth — every route works immediately with these unset):

```
A2UI_AUTH_MODE=none
```

Set to `jwt` and implement `getIdentity()`/`getAuthToken()` in
`{SERVER_ROOT}/a2ui/auth.ts` (they throw a clear error telling you to do
this until you do) for real auth — see `references/auth-jwt-example.md` for
a complete, working example including the JWKS-based bearer-token pattern.
That reference also names the auth-related env vars this introduces
(`A2UI_AUTH_BASE_URL`, `A2UI_AUTH_TOKEN_URL`, `A2UI_AUTH_JWKS_URL`) — they
aren't read by anything until you add that code, so don't set them for the
`none` default.

## Step 6 — wire two app-shell providers

`A2UIChatContainer` and its children need two ancestors somewhere above them
in the tree — most simply in the root layout. Without these, the page
throws at render/prerender time (`No QueryClient set...` /
`Tooltip must be used within TooltipProvider`), not at build/typecheck time
— easy to miss until you actually load the page.

```tsx
// src/app/providers.tsx
"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

```tsx
// src/app/layout.tsx
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
```

If the target project already has its own `QueryClientProvider`/`TooltipProvider`
setup (common in an existing app), skip this step — just confirm both
already wrap wherever the chat page mounts.

## Step 7 — wire a page

Nothing renders until at least one route mounts `A2UIChatContainer`. Minimal
example at `src/app/[locale]/chat/page.tsx` (adjust the path/params to match
the target project's routing, and the import to match Step 1's
`CLIENT_ROOT` alias):

```tsx
import A2UIChatContainer from "@/modules/client/a2ui/components/A2UIChatContainer";

export default function ChatPage() {
  return (
    <A2UIChatContainer
      userId="demo-user"       // swap for the real authenticated user id once auth is wired up
      basePath="/chat"
      workflowType="chat"
    />
  );
}
```

At this point the page renders, the sidebar/history/launcher all work, and
`GET /api/workflow/permitted` returns an empty list because
`WORKFLOW_ENTRIES` (`{API_ROOT}/workflow/_registry.ts`) starts empty —
that's expected. The engine is fully wired; there's just nothing registered
to run yet.

## Step 8 — author real content (not covered by this skill)

- **See `references/example-dashboard.md` first** — a complete, working
  workflow + UI schema (two charts, one table, dummy stub endpoints
  included) built exactly the way the two docs below describe. Fastest way
  to see the whole pipeline work end to end before writing your own.
- **Workflows** — see `references/authoring-workflows.md`. Register each one
  in `{API_ROOT}/workflow/_registry.ts`.
- **UI schemas** — see `references/authoring-ui-schemas.md`. Register each
  one in `{CLIENT_ROOT}/a2ui/schemas/ui/index.ts`.
- **Validation schemas** for form-submit actions — add Zod schemas to
  `{CLIENT_ROOT}/a2ui/schemas/validation/index.ts`.
- **GraphQL documents** for GraphQL-transport resolvers/actions — add to
  `{CLIENT_ROOT}/a2ui/schemas/graphql/index.ts`.
- Browse whatever schemas get registered live via `UISchemaPreview`
  (`{CLIENT_ROOT}/a2ui/components/UISchemaPreview.tsx`) — mount it anywhere,
  e.g. an admin/debug page, to click through every registered schema and see
  it rendered.

## Verification checklist after scaffolding

1. `npm run build` (or `tsc --noEmit`) — should be clean. If not, the most
   likely cause is a missed shadcn/ui component or npm package from Steps
   2–3, or an import that still points at the default alias after a custom
   Step 1 root was chosen — double-check every file under the changed root
   actually got rewritten, not just placed at the new path.
2. Load the page from Step 7 — the chat input, history sidebar (empty
   state), and "Workflows" launcher tab (empty state, since
   `WORKFLOW_ENTRIES` is empty) should all render without console errors.
   A blank page or a `QueryClient`/`Tooltip` provider error here means
   Step 6 was skipped.
3. Confirm `GET /api/workflow/permitted` returns `200` with an empty array
   — proves the API routes, auth resolution, and registry are wired
   correctly even with zero workflows registered.
4. Once at least one workflow + UI schema are authored (Step 8), launch it
   from the "Workflows" tab and confirm a full step round-trip: context
   resolves, form/view renders, submit advances to the next step.
