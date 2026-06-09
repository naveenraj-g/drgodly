---
name: server-module
description: "Scaffold a new clean-architecture server module (domain → infra → usecases → controllers → DI → server actions) for the drgodly orchestrator client. Use when adding a new resource module (appointments, encounters, vitals, etc.)."
trigger: /server-module
---

# /server-module

Scaffold a complete server module that calls the drgodly orchestrator API, following clean architecture + ioctopus DI, identical to the patient module.

## Usage

```
/server-module <resource>
```

Examples:
- `/server-module appointment`
- `/server-module encounter`
- `/server-module vitals`

---

## Architecture Overview

```
Client (useServerAction hook)
  → Server Action  [presentation/actions/<resource>/<resource>.actions.ts]
    → runWithTransport()
      → Controller  [core/<resource>/interface-adapters/controllers/]
        → validates input with Zod (.safeParseAsync)
        → Use Case  [core/<resource>/application/usecases/]
          → getInjection("I<Resource>Service")
            → Service  [core/<resource>/infrastructure/services/<resource>.service.ts]
              → axios instance (baseURL = ORCHESTRATOR_API_URL/<resource>)
                → request interceptor attaches JWT via getAuthToken()
```

---

## File Structure to Create

```
src/modules/
├── entities/schemas/<resource>/
│   └── <resource>.schema.ts          ← Zod schemas + inferred types + action schemas
│
└── server/
    ├── di/
    │   ├── types.ts                  ← ADD I<Resource>Service symbol + return type
    │   ├── container.ts              ← ADD register<Resource>Module(ApplicationContainer)
    │   └── modules/
    │       ├── index.ts              ← ADD export
    │       └── <resource>/
    │           └── <resource>.module.ts
    │
    └── core/<resource>/
        ├── domain/interfaces/
        │   └── <resource>.service.interface.ts
        ├── infrastructure/services/
        │   └── <resource>.service.ts
        ├── application/usecases/
        │   └── <one file per operation>.usecase.ts
        └── interface-adapters/controllers/
            ├── index.ts
            └── <one file per operation>.controller.ts
│
└── presentation/actions/<resource>/
    └── <resource>.actions.ts
```

---

## Step-by-Step Instructions

### Step 1 — Explore the orchestrator

Read `E:\work\code\drgodly-orchestrator\src\<resource>\` to find:
- All route handlers (HTTP method + path)
- Request/response DTO shapes
- Required permissions/auth

### Step 2 — `entities/schemas/<resource>/<resource>.schema.ts`

Define in this order:
1. Response schema(s) → `T<Resource>Response`
2. Paginated response schema (if list endpoint exists) → `TPaginated<Resource>Response`
3. Input validation schemas per operation (no `id` in create, `id` included in update)
4. Action schemas — wrap each validation schema in `{ payload: ..., transportOptions?: TransportOptionsSchema }` for mutating ops; just `{ payload: ... }` for reads

```typescript
import { z } from "zod";

export const <Resource>ResponseSchema = z.object({ ... });
export type T<Resource>Response = z.infer<typeof <Resource>ResponseSchema>;

// Validation schemas
export const Create<Resource>ValidationSchema = z.object({ ... });
export type TCreate<Resource> = z.infer<typeof Create<Resource>ValidationSchema>;

export const Update<Resource>ValidationSchema = z.object({
  id: z.number(),
  // ... update fields
});
export type TUpdate<Resource> = z.infer<typeof Update<Resource>ValidationSchema>;

// DTO type (no id — used by service interface for update)
export const Update<Resource>DtoSchema = Update<Resource>ValidationSchema.omit({ id: true });
export type TUpdate<Resource>Dto = z.infer<typeof Update<Resource>DtoSchema>;

// Action schemas (ZSA input)
export const TransportOptionsSchema = z.object({
  url: z.string().nullish(),
  shouldRevalidate: z.boolean().optional(),
  shouldRedirect: z.boolean().optional(),
  revalidateType: z.enum(["page", "layout"]).optional(),
});

export const Create<Resource>ActionSchema = z.object({
  payload: Create<Resource>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
```

### Step 3 — Domain interface

```typescript
// src/modules/server/core/<resource>/domain/interfaces/<resource>.service.interface.ts
import { ... } from "@/modules/entities/schemas/<resource>/<resource>.schema";

export interface I<Resource>Service {
  create(dto: TCreate<Resource>): Promise<T<Resource>Response>;
  list(query?: T<Resource>Query): Promise<TPaginated<Resource>Response>;
  getById(id: number): Promise<T<Resource>Response>;
  update(id: number, dto: TUpdate<Resource>Dto): Promise<T<Resource>Response>;
  delete(id: number): Promise<void>;
}
```

### Step 4 — Service implementation

Use an **axios instance** — never raw `fetch`. Attach the JWT via a request interceptor so every method gets it automatically without any per-method header logic.

```typescript
// src/modules/server/core/<resource>/infrastructure/services/<resource>.service.ts
import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { BadGatewayError, ConflictError, ForbiddenError, NotFoundError,
         RateLimitError, UnauthorizedError, ValidationError }
  from "@/modules/server/shared/errors/commonErrors";

export class <Resource>Service implements I<Resource>Service {
  /** Axios instance scoped to the orchestrator's /<resource-path> base path. */
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.ORCHESTRATOR_API_URL;
    if (!url) throw new Error("ORCHESTRATOR_API_URL is not configured");

    this.client = axios.create({
      baseURL: `${url}/<resource-path>`,
      headers: { "Content-Type": "application/json" },
      // 10 s timeout — matches the orchestrator's own FHIR client default.
      timeout: 10_000,
    });

    /**
     * Request interceptor: attaches a fresh JWT before every outgoing request.
     * Tokens are short-lived and must not be reused across requests.
     */
    this.client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Maps an AxiosError from the orchestrator to the appropriate domain error and throws it.
   * Always throws — return type `never` means callers don't need a follow-up `throw`.
   *
   * HTTP status → domain error mapping:
   *  400 → ValidationError   401 → UnauthorizedError   403 → ForbiddenError
   *  404 → NotFoundError     409 → ConflictError        429 → RateLimitError
   *  5xx → BadGatewayError
   *
   * @param error - The AxiosError thrown by the axios instance on non-2xx responses.
   */
  private handleError(error: AxiosError): never {
    // axios pre-parses the response body — no need to call .json()
    const body = error.response?.data as Record<string, unknown> | undefined;
    const message =
      typeof body?.message === "string"
        ? body.message
        : (error.response?.statusText ?? error.message);

    switch (error.response?.status) {
      case 400: throw new ValidationError(message);
      case 401: throw new UnauthorizedError(message);
      case 403: throw new ForbiddenError(message);
      case 404: throw new NotFoundError(message);
      case 409: throw new ConflictError(message);
      case 429: throw new RateLimitError(message);
      default:  throw new BadGatewayError(
        `Orchestrator error ${error.response?.status ?? "unknown"}: ${message}`
      );
    }
  }

  async create(dto: TCreate<Resource>): Promise<T<Resource>Response> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "<Resource>Service.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await <Resource>ResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "<Resource>Service.create", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "<Resource>Service.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }

  // list, getById, update, delete follow the same try/catch/log pattern.
  // See patient.service.ts for the full working example.
}
```

### Step 5 — Use cases (one per operation)

```typescript
// src/modules/server/core/<resource>/application/usecases/create<Resource>.usecase.ts
import { getInjection } from "@/modules/server/di/container";

export async function create<Resource>UseCase(dto: TCreate<Resource>): Promise<T<Resource>Response> {
  const service = getInjection("I<Resource>Service");
  return service.create(dto);
}
```

### Step 6 — Controllers (one per operation)

```typescript
// src/modules/server/core/<resource>/interface-adapters/controllers/create<Resource>.controller.ts
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: T<Resource>Response) { return data; }
export type TCreate<Resource>ControllerOutput = ReturnType<typeof presenter>;

export async function create<Resource>Controller(input: unknown): Promise<TCreate<Resource>ControllerOutput> {
  const parsed = await Create<Resource>ValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await create<Resource>UseCase(parsed.data);
  return presenter(data);
}
```

Always create `index.ts` barrel exporting all controllers + their output types.

### Step 7 — Wire DI

**Edit** `src/modules/server/di/types.ts` — add to `DI_SYMBOLS` and `DI_RETURN_TYPES`:
```typescript
I<Resource>Service: Symbol.for("I<Resource>Service"),
// and
I<Resource>Service: I<Resource>Service;
```

**Create** `src/modules/server/di/modules/<resource>/<resource>.module.ts`:
```typescript
import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { <Resource>Service } from "@/modules/server/core/<resource>/infrastructure/services/<resource>.service";

export function register<Resource>Module(container: Container) {
  container.bind(DI_SYMBOLS.I<Resource>Service).toClass(<Resource>Service);
}
```

**Edit** `src/modules/server/di/modules/index.ts` — add export.

**Edit** `src/modules/server/di/container.ts` — call `register<Resource>Module(ApplicationContainer)`.

### Step 8 — Server actions

```typescript
// src/modules/server/presentation/actions/<resource>/<resource>.actions.ts
"use server";

import { authenticatedProcedure } from "../procedures";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { create<Resource>Controller, ... } from "@/modules/server/core/<resource>/interface-adapters/controllers";
import { Create<Resource>ActionSchema, ... } from "@/modules/entities/schemas/<resource>/<resource>.schema";

export const create<Resource>Action = authenticatedProcedure
  .createServerAction()
  .input(Create<Resource>ActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await create<Resource>Controller(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

// Read operations — no transportOptions needed:
export const get<Resource>ByIdAction = authenticatedProcedure
  .createServerAction()
  .input(Get<Resource>ByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await get<Resource>ByIdController(input.payload);
      return { result: data };
    });
  });
```

---

## Key Files to Reference

| File | Purpose |
|---|---|
| `src/modules/server/core/patient/` | Complete working example — copy the pattern |
| `src/modules/server/di/types.ts` | Add new DI symbols here |
| `src/modules/server/di/container.ts` | Register new modules here |
| `src/modules/server/di/modules/index.ts` | Export new module here |
| `src/modules/server/presentation/actions/procedures.ts` | `authenticatedProcedure` — reuse for all actions |
| `src/modules/server/auth/jwt-token.ts` | `getAuthToken()` — JWT for orchestrator calls |
| `src/modules/server/shared/errors/commonErrors.ts` | Domain errors for HTTP error mapping |

## Environment Variables

- `ORCHESTRATOR_API_URL` — base URL, e.g. `http://localhost:3010/api/v1`
- `BETTER_AUTH_URL` — used internally by `getAgentToken()`

## Logging

Every service method **must** follow the start / success / error pattern using `logOperation`.
The logger stack lives at `src/modules/server/config/logger/` (Winston + daily file rotation).

### Required imports

```typescript
import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
```

### Method template

```typescript
/**
 * [What the method does — one line]
 *
 * @param id  - [description]
 * @returns   - [description]
 * @throws ValidationError | NotFoundError | BadGatewayError  (list relevant ones)
 */
async myMethod(id: number): Promise<TMyResponse> {
  // Capture start time and a unique trace ID before any async work.
  const startTimeMs = Date.now();
  const operationId = randomUUID();

  logOperation("start", {
    name: "<Resource>Service.myMethod",   // "ClassName.methodName" convention
    startTimeMs,
    context: { operationId, id },         // include any relevant input IDs
  });

  try {
    // JWT is injected automatically by the request interceptor — no authHeaders() call needed.
    const res = await this.client.get<unknown>(`/${id}`);

    // axios pre-parses JSON — access res.data directly, no await res.json()
    const data = await MyResponseSchema.parseAsync(res.data);

    logOperation("success", {
      name: "<Resource>Service.myMethod",
      startTimeMs,
      data,                               // pass array for list ops so recordCount is set
      context: { operationId, id },
    });

    return data;
  } catch (err) {
    // Always log then re-throw — never swallow errors silently.
    logOperation("error", {
      name: "<Resource>Service.myMethod",
      startTimeMs,
      err,
      context: { operationId, id },
    });
    // axios throws on non-2xx — map to domain error before re-throwing.
    if (axios.isAxiosError(err)) this.handleError(err);
    throw err;
  }
}
```

### Context field guidelines

| Operation | Useful context fields |
|---|---|
| create / register | `operationId`, `user_id` or relevant input ID |
| list | `operationId`, spread query params, `total` on success |
| getById / getSummary | `operationId`, `<resource>Id` |
| update | `operationId`, `<resource>Id` |
| delete | `operationId`, `<resource>Id` |

### For list operations pass `data.data` (the array) to success log

```typescript
logOperation("success", {
  name: "<Resource>Service.list",
  startTimeMs,
  data: data.data,   // ← the array, so recordCount is derived automatically
  context: { operationId, total: data.total },
});
```

### handleError — always document the status → error mapping

`handleError` is **synchronous** and takes an `AxiosError` (not a `Response`). axios pre-parses
the body so there is no async JSON extraction. Return type is `never` (not `Promise<never>`).

```typescript
/**
 * Maps an AxiosError from the orchestrator to the appropriate domain error and throws it.
 * Always throws — return type `never` communicates this to TypeScript.
 *
 * HTTP → domain error mapping:
 *  400 → ValidationError   401 → UnauthorizedError   403 → ForbiddenError
 *  404 → NotFoundError     409 → ConflictError        429 → RateLimitError
 *  5xx → BadGatewayError
 *
 * @param error - The AxiosError thrown by the axios instance on non-2xx responses.
 */
private handleError(error: AxiosError): never {
  // axios pre-parses the body — no need to call .json()
  const body = error.response?.data as Record<string, unknown> | undefined;
  const message =
    typeof body?.message === "string"
      ? body.message
      : (error.response?.statusText ?? error.message);

  switch (error.response?.status) {
    case 400: throw new ValidationError(message);
    case 401: throw new UnauthorizedError(message);
    case 403: throw new ForbiddenError(message);
    case 404: throw new NotFoundError(message);
    case 409: throw new ConflictError(message);
    case 429: throw new RateLimitError(message);
    default:  throw new BadGatewayError(
      `Orchestrator error ${error.response?.status ?? "unknown"}: ${message}`
    );
  }
}
```

**In the catch block**, always check `axios.isAxiosError` before calling `handleError`:
```typescript
} catch (err) {
  logOperation("error", { ... });
  if (axios.isAxiosError(err)) this.handleError(err);
  throw err; // re-throw non-axios errors (e.g. Zod parse failures) unchanged
}
```

## Comments

All code in this project must be well-commented (project rule in CLAUDE.md):
- File-level block explaining the file's role and layer
- JSDoc on every class, function, and method with `@param` / `@returns` / `@throws`
- Inline comments on non-obvious logic (HTTP status mapping, workarounds, business rules)

## Rules

- Never use classes in use cases or controllers — plain async functions only
- `skipInputParsing: true` on all ZSA actions — validation is the controller's job
- **Use axios, never `fetch`** — all orchestrator calls go through `this.client` (an `AxiosInstance`)
- Create the axios instance in the constructor with `baseURL`, `Content-Type` header, and `timeout: 10_000`
- Attach the JWT via a **request interceptor** — never call `getAuthToken()` inside individual methods
- `handleError(error: AxiosError): never` is **synchronous** — axios pre-parses the body, no `await res.json()`
- In every catch block: `if (axios.isAxiosError(err)) this.handleError(err); throw err;`
- `handleError` always throws — return type is `never` (not `Promise<never>`)
- Mutating actions (create/update/delete) include `transportOptions`; reads do not
- All actions go through `authenticatedProcedure` — never use bare `createServerAction()`
