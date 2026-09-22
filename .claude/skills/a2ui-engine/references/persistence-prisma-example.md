# Durable persistence with Prisma

`{SERVER_ROOT}/a2ui/memory-session-store.ts` (the default `SessionStore`
implementation) keeps everything in a module-level `Map`, which resets on
every server restart. That's the right choice for local development or a
demo, but a real deployment needs chat history to survive restarts/redeploys.
This is a complete Prisma schema + implementation matching the `SessionStore`
interface (`{SERVER_ROOT}/a2ui/session-store.ts`) — copy both in and swap the
`store.ts` export.

## 1. Prisma schema

Append to your `schema.prisma`:

```prisma
model A2uiChatSession {
  id        String   @id @default(uuid())
  userId    String
  orgId     String?
  title     String   @default("New chat")
  pinned    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages       A2uiChatMessage[]
  workflowStates A2uiWorkflowState[]

  @@index([userId, updatedAt])
}

model A2uiChatMessage {
  id        String   @id @default(uuid())
  sessionId String
  session   A2uiChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String   // "USER" | "ASSISTANT"
  content   String   @db.Text
  type      String
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([sessionId, createdAt])
}

model A2uiWorkflowState {
  id                 String   @id @default(uuid())
  sessionId          String
  session            A2uiChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  workflowId         String
  workflowName       String
  workflowDefinition Json
  sessionContext     Json
  currentStepIndex   Int      @default(0)
  status             String   // "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "ERROR"
  completedAt        DateTime?
  updatedAt          DateTime @updatedAt

  stepSubmissions A2uiStepSubmission[]

  @@index([sessionId])
}

model A2uiStepSubmission {
  id               String   @id @default(uuid())
  workflowStateId  String
  workflowState    A2uiWorkflowState @relation(fields: [workflowStateId], references: [id], onDelete: Cascade)
  stepIndex        Int
  stepId           String
  stepName         String
  actionName       String?
  formData         Json?
  responseData     Json?
  extractedOutputs Json?
  submittedAt      DateTime @default(now())

  @@index([workflowStateId])
}
```

Run `npx prisma migrate dev --name add_a2ui_chat_persistence` after adding this.

## 2. Implementation

`{SERVER_ROOT}/a2ui/prisma-session-store.ts`:

```ts
import { prisma } from "@/lib/prisma"; // your own Prisma client singleton
import type {
  SessionStore, SessionRow, MessageRow, WorkflowStateRow,
  StepSubmissionRow, SessionWithDetail,
} from "./session-store";

function toPublicRow(session: {
  id: string; userId: string; orgId: string | null; title: string;
  pinned: boolean; createdAt: Date; updatedAt: Date;
  messages: { id: string }[];
  workflowStates: { id: string; workflowName: string; status: string }[];
}): SessionRow {
  return {
    id: session.id,
    userId: session.userId,
    orgId: session.orgId,
    title: session.title,
    pinned: session.pinned,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    hasActiveWorkflow: session.workflowStates.some((w) => w.status === "IN_PROGRESS"),
    workflows: session.workflowStates.map((w) => ({
      id: w.id, workflowName: w.workflowName, status: w.status as SessionRow["workflows"][number]["status"],
    })),
  };
}

export class PrismaSessionStore implements SessionStore {
  async listSessions(userId: string, limit: number): Promise<SessionRow[]> {
    const rows = await prisma.a2uiChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        messages: { select: { id: true } },
        workflowStates: { select: { id: true, workflowName: true, status: true } },
      },
    });
    return rows.map(toPublicRow);
  }

  async createSession(input: { userId: string; orgId?: string; title?: string }): Promise<SessionRow> {
    const row = await prisma.a2uiChatSession.create({
      data: { userId: input.userId, orgId: input.orgId, title: input.title ?? "New chat" },
      include: { messages: true, workflowStates: true },
    });
    return toPublicRow(row);
  }

  async getSessionDetail(id: string, userId: string): Promise<SessionWithDetail | null> {
    const row = await prisma.a2uiChatSession.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        workflowStates: { include: { stepSubmissions: true } },
      },
    });
    if (!row) return null;

    const active = row.workflowStates.find((w) => w.status === "IN_PROGRESS") ?? null;
    const completed = row.workflowStates.filter((w) => w.status !== "IN_PROGRESS");

    return {
      session: toPublicRow(row),
      messages: row.messages as unknown as MessageRow[],
      activeWorkflow: active as unknown as WorkflowStateRow | null,
      completedWorkflows: completed as unknown as WorkflowStateRow[],
    };
  }

  async deleteSession(id: string): Promise<void> {
    await prisma.a2uiChatSession.delete({ where: { id } });
  }

  async renameSession(id: string, title: string): Promise<void> {
    await prisma.a2uiChatSession.update({ where: { id }, data: { title } });
  }

  async pinSession(id: string, pinned: boolean): Promise<void> {
    await prisma.a2uiChatSession.update({ where: { id }, data: { pinned } });
  }

  async addMessage(
    sessionId: string,
    message: Omit<MessageRow, "id" | "sessionId" | "createdAt">,
  ): Promise<MessageRow> {
    const [row] = await prisma.$transaction([
      prisma.a2uiChatMessage.create({ data: { sessionId, ...message } }),
      prisma.a2uiChatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } }),
    ]);
    return row as unknown as MessageRow;
  }

  async createWorkflowState(input: {
    sessionId: string; workflowId: string; workflowName: string;
    workflowDefinition: unknown; sessionContext: Record<string, unknown>;
  }): Promise<WorkflowStateRow> {
    const row = await prisma.a2uiWorkflowState.create({
      data: {
        sessionId: input.sessionId,
        workflowId: input.workflowId,
        workflowName: input.workflowName,
        workflowDefinition: input.workflowDefinition as object,
        sessionContext: input.sessionContext as object,
        status: "IN_PROGRESS",
      },
      include: { stepSubmissions: true },
    });
    return row as unknown as WorkflowStateRow;
  }

  async updateWorkflowState(
    id: string,
    patch: Partial<Pick<WorkflowStateRow, "currentStepIndex" | "sessionContext" | "status" | "completedAt">>,
  ): Promise<WorkflowStateRow> {
    const row = await prisma.a2uiWorkflowState.update({
      where: { id },
      data: patch as object,
      include: { stepSubmissions: true },
    });
    return row as unknown as WorkflowStateRow;
  }

  async addStepSubmission(
    workflowStateId: string,
    input: Omit<StepSubmissionRow, "id" | "submittedAt">,
  ): Promise<StepSubmissionRow> {
    const row = await prisma.a2uiStepSubmission.create({
      data: { workflowStateId, ...input },
    });
    return row as unknown as StepSubmissionRow;
  }
}
```

## 3. Swap it in

```ts
// {SERVER_ROOT}/a2ui/store.ts
import { PrismaSessionStore } from "./prisma-session-store";
import type { SessionStore } from "./session-store";

export const sessionStore: SessionStore = new PrismaSessionStore();
```

Nothing else changes — every client hook and server action goes through
`session-actions.ts`, which only knows about the `SessionStore` interface.
