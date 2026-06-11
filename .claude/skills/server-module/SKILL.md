---
name: server-module
description: "Scaffold a new clean-architecture server module (domain → infra → usecases → controllers → DI → server actions) for the drgodly project. Supports both REST (default) and GraphQL transports via DI switching."
trigger: /server-module
---

# /server-module

Scaffold a complete server module following clean architecture + ioctopus DI, matching the organization module pattern.

## Usage

```
/server-module <resource>
```

Examples: `/server-module appointment` · `/server-module encounter` · `/server-module vitals`

---

## Architecture

```
Client (useServerAction)
  → Server Action  [presentation/actions/<resource>/<resource>.actions.ts]
    → runWithTransport()
      → Controller  [core/<resource>/interface-adapters/controllers/]
        → safeParseAsync input
        → Use Case  [core/<resource>/application/usecases/]
          → getInjection("I<Resource>sService")
            → Service (REST or GraphQL — resolved by DI)
              → axios instance → request interceptor → JWT via getAuthToken()
```

---

## File Structure

```
src/modules/
├── entities/schemas/<resource>/
│   └── <resource>.schema.ts
│
└── server/
    ├── di/
    │   ├── types.ts                   ← ADD symbol + return type (EDIT)
    │   ├── container.ts               ← ADD register call (EDIT)
    │   └── modules/
    │       ├── index.ts               ← ADD export (EDIT)
    │       └── <resource>/
    │           └── <resource>.module.ts
    │
    ├── core/<resource>/
    │   ├── domain/interfaces/
    │   │   └── <resource>.service.interface.ts
    │   ├── infrastructure/services/
    │   │   ├── <resource>.rest.service.ts    ← active implementation
    │   │   └── <resource>.graphql.service.ts ← stub (placeholder)
    │   ├── application/usecases/
    │   │   └── <operation>.usecase.ts        ← one file per operation
    │   └── interface-adapters/controllers/
    │       ├── index.ts
    │       └── <operation>.controller.ts     ← one file per operation
    │
    └── presentation/actions/<resource>/
        └── <resource>.actions.ts
```

---

## Step 1 — Explore the source API

Read the source API project (orchestrator or fhir-gql) to find:
- All HTTP endpoints (method + path)
- Request/response payload shapes — check Python Pydantic models for exact field nullability
- Required permissions/auth

---

## Step 2 — `entities/schemas/<resource>/<resource>.schema.ts`

Schema group order:
1. **Response schemas** — use `.nullish()` on every optional field (Python's `Optional[X] = None` serialises as explicit JSON `null`, not missing)
2. **Paginated response** (if list endpoint exists)
3. **Input validation schemas** — create / update / list / getById / delete
4. **DTO type** for update (omit `id` — used by service interface)
5. **Action schemas** — mutating ops include `transportOptions`, reads do not
6. **Form schemas** — flat UI schemas for React Hook Form (Create + Edit)

```typescript
import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";

// ── Response schemas ───────────────────────────────────────────────────────────
// Use .nullish() (not .optional()) — the API can return explicit JSON null.

export const <Resource>ResponseSchema = z.object({
  id: z.number(),
  name: z.string().nullish(),
  // ... all other optional fields use .nullish()
});
export type T<Resource>Response = z.infer<typeof <Resource>ResponseSchema>;

export const Paginated<Resource>ResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(<Resource>ResponseSchema),
});
export type TPaginated<Resource>Response = z.infer<typeof Paginated<Resource>ResponseSchema>;

// ── Input validation schemas ───────────────────────────────────────────────────

export const Create<Resource>ValidationSchema = z.object({ /* ... */ });
export type TCreate<Resource> = z.infer<typeof Create<Resource>ValidationSchema>;

const Update<Resource>BaseSchema = z.object({ /* patchable fields only */ });
export const Update<Resource>DtoSchema = Update<Resource>BaseSchema;
export type TUpdate<Resource>Dto = z.infer<typeof Update<Resource>DtoSchema>;

export const Update<Resource>ValidationSchema = Update<Resource>BaseSchema.extend({ id: z.number() });
export type TUpdate<Resource> = z.infer<typeof Update<Resource>ValidationSchema>;

export const List<Resource>sValidationSchema = z.object({ limit: z.number().optional(), offset: z.number().optional() });
export type TList<Resource>sQuery = z.infer<typeof List<Resource>sValidationSchema>;

export const GetById<Resource>ValidationSchema = z.object({ id: z.number() });
export const Delete<Resource>ValidationSchema = z.object({ id: z.number() });

// ── Action schemas ─────────────────────────────────────────────────────────────
// TransportOptionsSchema imported from shared location — never define it inline.

export const Create<Resource>ActionSchema = z.object({
  payload: Create<Resource>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreate<Resource>Action = z.infer<typeof Create<Resource>ActionSchema>;

export const List<Resource>sActionSchema = z.object({ payload: List<Resource>sValidationSchema.optional() });
export type TList<Resource>sAction = z.infer<typeof List<Resource>sActionSchema>;

export const GetById<Resource>ActionSchema = z.object({ payload: GetById<Resource>ValidationSchema });
export const Update<Resource>ActionSchema = z.object({
  payload: Update<Resource>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export const Delete<Resource>ActionSchema = z.object({
  payload: Delete<Resource>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// ── Form schemas ───────────────────────────────────────────────────────────────
// Flat UI schemas for React Hook Form — intentionally simpler than validation schemas.
// The modal maps flat form values to the nested API payload before calling the action.

export const Create<Resource>FormSchema = z.object({ /* flat fields */ });
export type TCreate<Resource>FormSchema = z.infer<typeof Create<Resource>FormSchema>;

export const Edit<Resource>FormSchema = z.object({ /* flat patchable fields */ });
export type TEdit<Resource>FormSchema = z.infer<typeof Edit<Resource>FormSchema>;
```

---

## Step 3 — Domain interface

Naming convention: **plural** (`I<Resource>sService`, not `I<Resource>Service`).

```typescript
// domain/interfaces/<resource>.service.interface.ts
export interface I<Resource>sService {
  create(dto: TCreate<Resource>): Promise<T<Resource>Response>;
  list(query?: TList<Resource>sQuery): Promise<TPaginated<Resource>Response>;
  getById(id: number): Promise<T<Resource>Response>;
  update(id: number, dto: TUpdate<Resource>Dto): Promise<T<Resource>Response>;
  delete(id: number): Promise<void>;
}
```

---

## Step 4 — Services (REST + GraphQL stub)

Create **two files**. The DI module selects between them at startup via `FHIR_TRANSPORT` (or a resource-specific env var).

### `<resource>.rest.service.ts` — active implementation

```typescript
/**
 * <Resource>RestApiService — REST transport implementation of I<Resource>sService.
 * Transport: REST  (bound when FHIR_TRANSPORT !== "graphql")
 * For GraphQL transport, see <resource>.graphql.service.ts.
 */
import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { BadGatewayError, ConflictError, ForbiddenError, NotFoundError,
         RateLimitError, UnauthorizedError, ValidationError }
  from "@/modules/server/shared/errors/commonErrors";
import { I<Resource>sService } from "../../domain/interfaces/<resource>.service.interface";

export class <Resource>RestApiService implements I<Resource>sService {
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.ORCHESTRATOR_API_URL; // or FHIR_GQL_URL for fhir-gql resources
    if (!url) throw new Error("ORCHESTRATOR_API_URL is not configured");
    this.client = axios.create({
      baseURL: `${url}/<resource-path>`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });
    this.client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Maps AxiosError → domain error. Always throws (return type: never).
   * 400→ValidationError  401→UnauthorizedError  403→ForbiddenError
   * 404→NotFoundError    409→ConflictError       429→RateLimitError  5xx→BadGatewayError
   */
  private handleError(error: AxiosError): never {
    const body = error.response?.data as Record<string, unknown> | undefined;
    const message = typeof body?.message === "string"
      ? body.message : (error.response?.statusText ?? error.message);
    switch (error.response?.status) {
      case 400: throw new ValidationError(message);
      case 401: throw new UnauthorizedError(message);
      case 403: throw new ForbiddenError(message);
      case 404: throw new NotFoundError(message);
      case 409: throw new ConflictError(message);
      case 429: throw new RateLimitError(message);
      default:  throw new BadGatewayError(`API error ${error.response?.status ?? "unknown"}: ${message}`);
    }
  }

  async create(dto: TCreate<Resource>): Promise<T<Resource>Response> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "<Resource>RestApiService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await <Resource>ResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "<Resource>RestApiService.create", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "<Resource>RestApiService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
  // list, getById, update, delete — same try/catch/log pattern.
}
```

### `<resource>.graphql.service.ts` — stub (placeholder)

```typescript
/**
 * <Resource>GraphQLService — GraphQL transport stub for I<Resource>sService.
 * Not yet implemented. Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the REST implementation.
 */
export class <Resource>GraphQLService implements I<Resource>sService {
  async create(_dto: TCreate<Resource>): Promise<T<Resource>Response> {
    throw new Error("<Resource>GraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  async list(_query?: TList<Resource>sQuery): Promise<TPaginated<Resource>Response> {
    throw new Error("<Resource>GraphQLService.list is not yet implemented.");
  }
  async getById(_id: number): Promise<T<Resource>Response> {
    throw new Error("<Resource>GraphQLService.getById is not yet implemented.");
  }
  async update(_id: number, _dto: TUpdate<Resource>Dto): Promise<T<Resource>Response> {
    throw new Error("<Resource>GraphQLService.update is not yet implemented.");
  }
  async delete(_id: number): Promise<void> {
    throw new Error("<Resource>GraphQLService.delete is not yet implemented.");
  }
}
```

---

## Step 5 — Use cases (one file per operation)

```typescript
// application/usecases/create<Resource>.usecase.ts
import { getInjection } from "@/modules/server/di/container";

export async function create<Resource>UseCase(dto: TCreate<Resource>): Promise<T<Resource>Response> {
  const service = getInjection("I<Resource>sService"); // ← plural
  return service.create(dto);
}
```

---

## Step 6 — Controllers (one file per operation)

```typescript
// interface-adapters/controllers/create<Resource>.controller.ts
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

Always create `interface-adapters/controllers/index.ts` barrel exporting all controllers + output types.

---

## Step 7 — Wire DI

**Edit `di/types.ts`** — add to both `DI_SYMBOLS` and `DI_RETURN_TYPES`:
```typescript
// DI_SYMBOLS
I<Resource>sService: Symbol.for("I<Resource>sService"),

// DI_RETURN_TYPES
I<Resource>sService: I<Resource>sService;
```

**Create `di/modules/<resource>/<resource>.module.ts`**:
```typescript
/**
 * Binds I<Resource>sService to REST or GraphQL implementation.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { <Resource>RestApiService } from "@/modules/server/core/<resource>/infrastructure/services/<resource>.rest.service";
import { <Resource>GraphQLService } from "@/modules/server/core/<resource>/infrastructure/services/<resource>.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function register<Resource>Module(container: Container) {
  container
    .bind(DI_SYMBOLS.I<Resource>sService)
    .toClass(transport === "graphql" ? <Resource>GraphQLService : <Resource>RestApiService);
}
```

**Edit `di/modules/index.ts`** — add `export * from "./<resource>/<resource>.module";`

**Edit `di/container.ts`** — add `register<Resource>Module(ApplicationContainer);`

---

## Step 8 — Server actions

```typescript
// presentation/actions/<resource>/<resource>.actions.ts
"use server";

// Use adminProcedure for admin-area resources (organization management, etc.)
// Use authenticatedProcedure for user-facing resources (patient-owned data, etc.)
import { adminProcedure } from "../procedures";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";

export const create<Resource>Action = adminProcedure
  .createServerAction()
  .input(Create<Resource>ActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await create<Resource>Controller(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

// Read operations — no transportOptions:
export const list<Resource>sAction = adminProcedure
  .createServerAction()
  .input(List<Resource>sActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await list<Resource>sController(input.payload);
      return { result: data };
    });
  });
```

---

## Rules

- **Service naming**: `I<Resource>sService` (plural interface), `<Resource>RestApiService` / `<Resource>GraphQLService` (classes)
- **Two service files always**: REST (active) + GraphQL (stub). DI module switches via `process.env.FHIR_TRANSPORT ?? "rest"`
- **Response schema fields**: `.nullish()` not `.optional()` — APIs return explicit `null`, not missing keys
- **TransportOptionsSchema**: always import from `@/modules/entities/schemas/transport` — never define inline
- **Procedure**: `adminProcedure` for admin resources, `authenticatedProcedure` for user-facing resources
- **Use cases and controllers**: plain async functions only — never classes
- **`skipInputParsing: true`** on all ZSA actions — validation is the controller's job
- **Axios, never fetch** — `AxiosInstance` with `baseURL`, `Content-Type`, `timeout: 10_000`, JWT interceptor
- **`handleError(error: AxiosError): never`** — synchronous, return type `never`; `if (axios.isAxiosError(err)) this.handleError(err); throw err;`
- **Comments**: file-level block + JSDoc on every class/function/method (project rule)

## Key Reference Files

| File | Purpose |
|---|---|
| `server/core/organization/` | Full working example for fhir-gql resources |
| `server/core/patient/` | Full working example for orchestrator resources |
| `server/di/types.ts` | Add symbols here |
| `server/di/container.ts` | Register modules here |
| `server/shared/auth/roles.ts` | Role groups for `adminProcedure` |
| `entities/schemas/transport/index.ts` | Canonical `TransportOptionsSchema` |
