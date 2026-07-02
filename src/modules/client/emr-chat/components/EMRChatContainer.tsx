/**
 * EMRChatContainer — the EMR workflow chat interface with session persistence.
 *
 * Layer: client / emr-chat / components
 *
 * This component is the redesigned, persistence-aware replacement for A2UIChat.
 * It orchestrates:
 *
 *   UI layer:        ChatTopbar + WorkflowProgressBanner + message list + ChatInput
 *   Workflow logic:  /api/workflow, /api/workflow/step, /api/workflow/submit
 *   Persistence:     Every user message, assistant reply, workflow start, step
 *                    submission, and workflow completion/abandonment is saved to
 *                    the database via ZSA server actions so sessions survive
 *                    navigation and browser close.
 *   Routing:         Each session has its own URL (/emr-chat/[sessionId]).
 *                    - New session: URL is updated silently after creation so the
 *                      component stays mounted and the in-flight API call completes.
 *                    - Existing session (from sidebar): router.push navigates to the
 *                      session URL, the server page pre-loads the session from DB,
 *                      and passes it as `initialSession` so there's no loading flash.
 *
 * Props:
 *   userId         — Better Auth user.id from the server page.
 *   orgId          — active org from the server page (seeded into workflow context).
 *   sessionId      — UUID from the URL params, undefined on the blank new-chat page.
 *   initialSession — pre-loaded session data from the server page (avoids client DB call).
 */

"use client";

import { useRef, useEffect, useCallback, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { Bot, User, SkipForward, Send, Loader2 } from "lucide-react";
import { createMessageProcessor } from "@/modules/client/ai-hub/a2ui/rendering/processor";
import { Renderer } from "@/modules/client/ai-hub/a2ui/rendering/renderer";
import type {
  AnyComponentNode,
  MarkdownNode,
} from "@/modules/client/ai-hub/a2ui/types";
import { parseUI } from "@/modules/client/ai-hub/utils/mapUiSchemaDataV3";
import { UI_SCHEMA_REGISTRY } from "@/modules/client/ai-hub/schemas/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useChatStore,
  type ChatMessage,
} from "@/modules/client/ai-hub/store/chat-store";
import { useEmrChatStore } from "../stores/emr-chat.store";
import { ToolCallDetails } from "@/modules/client/ai-hub/components/ToolCallDetails";
import { PermissionDeniedMessage } from "@/modules/client/ai-hub/components/PermissionDeniedMessage";
import { SessionSidebar } from "./SessionSidebar";
import { ChatTopbar } from "./ChatTopbar";
import { WorkflowProgressBanner } from "./WorkflowProgressBanner";
import { SessionGreeting } from "./SessionGreeting";
import {
  createEmrChatSessionAction,
  listEmrChatSessionsAction,
  deleteEmrChatSessionAction,
  addEmrChatMessageAction,
  createWorkflowStateAction,
  updateWorkflowStateAction,
  addStepSubmissionAction,
} from "@/modules/server/presentation/actions/emr-chat/emr-chat.actions";
import type {
  TEmrChatMessage,
  TEmrChatSessionFull,
} from "@/modules/entities/schemas/emr-chat";
import { emrChatStore } from "../stores/emr-chat.store";
import type {
  WorkflowDefinition,
  WorkflowStepDefinition,
} from "@/types/workflow";

// ── Shared processor (one per chat session in memory) ─────────────────────────

const processor = createMessageProcessor();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wraps a plain string as a Markdown node for the Renderer. */
function buildMarkdownNode(content: string): MarkdownNode {
  return {
    id: crypto.randomUUID(),
    type: "Markdown",
    properties: { content: { literalString: content } },
  };
}

/** Returns workflow steps in sequence_number order. */
function getSortedSteps(
  workflow: WorkflowDefinition,
): WorkflowStepDefinition[] {
  return [...workflow.workflow_steps].sort(
    (a, b) => a.sequence_number - b.sequence_number,
  );
}

/** Parses a UI schema + step data into a component node tree. */
function buildUiFromData(
  ui: unknown,
  stepData: unknown,
): AnyComponentNode | null {
  if (!ui) return null;
  try {
    return parseUI(JSON.stringify({ ui, data: stepData ?? null }));
  } catch {
    return null;
  }
}

/** Truncates the first user message to make a session title (≤ 60 chars). */
function titleFromMessage(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EMRChatContainerProps {
  /** Better Auth user.id (from server page session). */
  userId: string;
  /** Active org UUID from Better Auth session (seeded into workflow context). */
  orgId?: string | null;
  /**
   * UUID from the URL params — present on /emr-chat/[sessionId], absent on /emr-chat.
   * Used to set the active session on mount without an additional DB call.
   */
  sessionId?: string;
  /**
   * Full session data pre-fetched by the server page.
   * When present, the container restores messages and workflow state from this
   * on mount instead of fetching from the DB client-side.
   */
  initialSession?: TEmrChatSessionFull;
  /**
   * Base path for session routing (without locale prefix), e.g.
   * "/bezs/telemedicine/admin/emr-chat" or "/bezs/telemedicine/doctor/emr".
   * Used to construct new-chat and session URLs so this component works across
   * multiple portal sections.
   */
  basePath: string;
}

/**
 * Full EMR chat interface with session history sidebar and DB persistence.
 *
 * @param userId - The authenticated user's ID.
 * @param orgId - The active organization ID (optional).
 * @param sessionId - Session UUID from URL params (undefined on blank new-chat page).
 * @param initialSession - Pre-loaded session from the server page.
 */
export default function EMRChatContainer({
  userId,
  orgId,
  sessionId: urlSessionId,
  initialSession,
  basePath,
}: EMRChatContainerProps) {
  // ── Chat message state ────────────────────────────────────────────────────
  const {
    messages,
    input,
    loading,
    addMessage,
    updateMessage,
    setInput,
    setLoading,
    sessionContext,
    activeWorkflow,
    currentStepIndex,
    mergeContext,
    setWorkflow,
    clearSession,
    loadState,
  } = useChatStore();

  // ── Session management state ──────────────────────────────────────────────
  const {
    sessions,
    activeSessionId,
    isHistoryOpen,
    isLoadingSessions,
    setSessions,
    setActiveSessionId,
    setIsLoadingSessions,
    openHistory,
    closeHistory,
    prependSession,
    removeSession,
    updateSessionTitle,
  } = useEmrChatStore();

  // dbWorkflowStateId: UUID of the persisted EmrWorkflowState row for the
  // current in-flight workflow. Needed to call updateWorkflowStateAction.
  const [dbWorkflowStateId, setDbWorkflowStateId] = useState<string | null>(
    null,
  );

  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [, startTransition] = useTransition();
  // Guard so the initialSession effect only runs once even in React StrictMode.
  const initialised = useRef(false);

  // ── Restore state from server-pre-loaded session ─────────────────────────

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    if (!initialSession) {
      // Blank new-chat landing — clear any leftover state from a previous session.
      useChatStore.setState({
        messages: [],
        input: "",
        sessionContext: {},
        activeWorkflow: null,
        currentStepIndex: null,
      });
      setActiveSessionId(null);
      setDbWorkflowStateId(null);
      return;
    }

    // Session page — restore messages and workflow state pre-loaded by the server.
    setActiveSessionId(initialSession.id);

    // Base messages from DB (all types rendered as markdown where content exists).
    const dbMessages: ChatMessage[] = initialSession.messages.map(
      (m: TEmrChatMessage) => ({
        id: m.id,
        role: m.role.toLowerCase() as "user" | "assistant",
        text: m.role === "USER" ? m.content : undefined,
        // Skip ui when toolCall metadata is present — ToolCallDetails renders instead.
        ui:
          m.role === "ASSISTANT" && m.content && !m.metadata?.toolCall
            ? buildMarkdownNode(m.content)
            : null,
        toolCall:
          m.metadata?.toolCall !== undefined
            ? (m.metadata.toolCall as ChatMessage["toolCall"])
            : undefined,
      }),
    );

    // For completed/abandoned workflows, inject step-submission summaries chronologically.
    // This covers old sessions created before WORKFLOW_STEP messages were persisted to DB.
    const persistedWorkflowStepTypes = new Set([
      "WORKFLOW_STEP",
      "WORKFLOW_COMPLETE",
      "WORKFLOW_ABANDONED",
    ]);
    const hasPersistedStepMessages = initialSession.messages.some(
      (m: TEmrChatMessage) => persistedWorkflowStepTypes.has(m.type ?? ""),
    );

    // Build a flat list of injected messages from all completed workflow step submissions,
    // sorted by submittedAt so they interleave correctly with DB messages.
    type Timed = { at: Date; msg: ChatMessage };
    const timedInjections: Timed[] = [];

    if (!hasPersistedStepMessages) {
      for (const wf of initialSession.completedWorkflows ?? []) {
        for (const sub of wf.stepSubmissions ?? []) {
          timedInjections.push({
            at: new Date(sub.submittedAt),
            msg: {
              id: `injected-step-${sub.id}`,
              role: "assistant",
              ui: buildMarkdownNode(`**${sub.stepName}** — submitted`),
            },
          });
        }

        // Inject a status notice at the end of each non-active workflow.
        const wfEndAt = new Date(wf.completedAt ?? wf.updatedAt);
        if (wf.status === "COMPLETED") {
          const wfDef = wf.workflowDefinition as {
            completion?: { message?: string };
          };
          const completionText =
            wfDef?.completion?.message ?? `**${wf.workflowName}** completed.`;
          timedInjections.push({
            at: wfEndAt,
            msg: {
              id: `injected-complete-${wf.id}`,
              role: "assistant",
              ui: buildMarkdownNode(completionText),
            },
          });
        } else if (wf.status === "ABANDONED" || wf.status === "ERROR") {
          // Find the step name at which the workflow was abandoned.
          const wfDef = wf.workflowDefinition as {
            workflow_steps?: Array<{ sequence_number: number; name: string }>;
          };
          const sortedSteps = (wfDef?.workflow_steps ?? [])
            .slice()
            .sort((a, b) => a.sequence_number - b.sequence_number);
          const stepAtAbandon = sortedSteps[wf.currentStepIndex];
          const noticeText = stepAtAbandon
            ? `**${wf.workflowName}** was abandoned at step ${wf.currentStepIndex + 1}: ${stepAtAbandon.name}.`
            : `**${wf.workflowName}** was abandoned.`;
          timedInjections.push({
            at: wfEndAt,
            msg: {
              id: `injected-abandoned-${wf.id}`,
              role: "assistant",
              ui: buildMarkdownNode(noticeText),
            },
          });
        }
      }
    }

    // Merge DB messages and timed injections sorted by timestamp.
    const dbWithTimestamps = dbMessages.map((msg, i) => ({
      at: new Date(initialSession.messages[i]?.createdAt ?? 0),
      msg,
    }));

    const allSorted = [...dbWithTimestamps, ...timedInjections].sort(
      (a, b) => a.at.getTime() - b.at.getTime(),
    );

    const restoredMessages: ChatMessage[] = allSorted.map((e) => e.msg);

    const restoredCtx =
      (initialSession.activeWorkflow?.sessionContext as Record<
        string,
        unknown
      >) ?? {};

    loadState({
      messages: restoredMessages,
      sessionContext: restoredCtx,
      activeWorkflow: initialSession.activeWorkflow
        ? (initialSession.activeWorkflow
            .workflowDefinition as unknown as WorkflowDefinition)
        : null,
      currentStepIndex: initialSession.activeWorkflow?.currentStepIndex ?? null,
    });

    if (initialSession.activeWorkflow) {
      setDbWorkflowStateId(initialSession.activeWorkflow.id);

      // Re-fetch the current step so the form re-renders with fresh context-resolver data.
      // The step form is never persisted to DB — only the intro (WORKFLOW_START) is saved.
      const wf = initialSession.activeWorkflow
        .workflowDefinition as unknown as WorkflowDefinition;
      const stepIdx = initialSession.activeWorkflow.currentStepIndex;
      loadWorkflowStep(wf, stepIdx, restoredCtx, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load session list on mount ────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchSessions() {
      setIsLoadingSessions(true);
      const [data] = await listEmrChatSessionsAction({
        payload: { userId, limit: 50 },
      });
      if (!cancelled && data) setSessions(data);
      setIsLoadingSessions(false);
    }

    fetchSessions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Auto-scroll on new messages ───────────────────────────────────────────

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Session helpers ───────────────────────────────────────────────────────

  /**
   * Ensures a DB session exists, creating one if needed.
   * On new session creation, updates the browser URL to /emr-chat/[id] using
   * history.replaceState so the component stays mounted and the in-flight
   * workflow API call is not abandoned. No full navigation occurs.
   *
   * @param firstMessageText - Used to generate the session title.
   * @returns The session UUID (existing or newly created).
   */
  const ensureSession = useCallback(
    async (firstMessageText?: string): Promise<string> => {
      if (activeSessionId) return activeSessionId;

      const [session] = await createEmrChatSessionAction({
        payload: {
          userId,
          orgId: orgId ?? undefined,
          title: firstMessageText
            ? titleFromMessage(firstMessageText)
            : undefined,
        },
      });

      if (!session) throw new Error("Failed to create chat session");

      setActiveSessionId(session.id);
      prependSession(session);

      // Update the URL without causing a navigation or remounting the component.
      // The next page refresh will load the session from DB via the [sessionId] server page.
      window.history.replaceState(
        null,
        "",
        `/${locale}${basePath}/${session.id}`,
      );

      return session.id;
    },
    [
      activeSessionId,
      userId,
      orgId,
      locale,
      setActiveSessionId,
      prependSession,
    ],
  );

  /**
   * Persists a message to the DB. Swallows errors — message is already in the
   * Zustand store, so the user experience is unaffected if the DB write fails.
   */
  const persistMessage = useCallback(
    async (
      sessionId: string,
      params: {
        role: "USER" | "ASSISTANT";
        content: string;
        type?: string;
        metadata?: Record<string, unknown>;
      },
    ) => {
      await addEmrChatMessageAction({
        payload: {
          sessionId,
          role: params.role,
          content: params.content,
          type: (params.type as "TEXT") ?? "TEXT",
          metadata: params.metadata,
        },
      });
    },
    [],
  );

  // ── New chat ──────────────────────────────────────────────────────────────

  /**
   * Navigates to the blank /emr-chat landing. The mount effect on that page
   * will clear the Zustand store so there's no leftover message flicker.
   * If already on the blank page (no urlSessionId), just clear in-place.
   */
  const startNewChat = useCallback(() => {
    if (!urlSessionId) {
      // Already on the blank landing — just clear state.
      useChatStore.setState({
        messages: [],
        input: "",
        sessionContext: {},
        activeWorkflow: null,
        currentStepIndex: null,
      });
      setActiveSessionId(null);
      setDbWorkflowStateId(null);
      inputRef.current?.focus();
    } else {
      router.push(`/${locale}${basePath}`);
    }
  }, [urlSessionId, locale, basePath, router, setActiveSessionId]);

  // ── Open existing session ─────────────────────────────────────────────────

  /**
   * Navigates to an existing session URL. The [sessionId] server page handles
   * loading the session from DB and passing it to EMRChatContainer as
   * `initialSession`, so no client-side DB call is needed here.
   *
   * @param sid - Session UUID to open.
   */
  const openSession = useCallback(
    (sid: string) => {
      router.push(`/${locale}${basePath}/${sid}`);
    },
    [router, locale, basePath],
  );

  // ── Delete session ────────────────────────────────────────────────────────

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      removeSession(sessionId);
      if (activeSessionId === sessionId) startNewChat();
      await deleteEmrChatSessionAction({ id: sessionId });
    },
    [removeSession, activeSessionId, startNewChat],
  );

  // ── Workflow step loader ──────────────────────────────────────────────────

  /**
   * Fetches a workflow step from /api/workflow/step and renders it in the chat.
   * Handles context-type steps by auto-advancing. Mirrors the logic in A2UIChat
   * but also persists the step as an ASSISTANT message.
   */
  const loadWorkflowStep = useCallback(
    async (
      workflow: WorkflowDefinition,
      stepIndex: number,
      ctx: Record<string, unknown>,
      persist: boolean = true,
    ) => {
      setLoading(true);
      try {
        const res = await fetch("/api/workflow/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflow, stepIndex, sessionContext: ctx }),
        });
        const data = await res.json();

        if (data.type === "error") {
          // Surface a permission denied card when the server returns missing_permissions
          // — gives the user clear, actionable feedback instead of a generic error string.
          if (Array.isArray(data.missing_permissions)) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              permissionDenied: {
                message: data.message,
                missing_permissions: data.missing_permissions,
              },
            });
          } else {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              ui: buildMarkdownNode(`⚠️ ${data.message}`),
            });
          }
          return;
        }

        const step: WorkflowStepDefinition =
          data.step ?? getSortedSteps(workflow)[stepIndex];

        if (data.sessionContext) mergeContext(data.sessionContext);

        // Auto-advance context steps without showing UI.
        if (step.step_type === "context") {
          const steps = getSortedSteps(workflow);
          const nextIndex = stepIndex + 1 < steps.length ? stepIndex + 1 : null;
          if (nextIndex !== null) {
            setWorkflow(workflow, nextIndex);
            await loadWorkflowStep(
              workflow,
              nextIndex,
              data.sessionContext ?? ctx,
            );
          } else {
            if (workflow.completion?.message) {
              addMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                ui: buildMarkdownNode(workflow.completion.message),
              });
              if (persist) {
                const sid = emrChatStore.getState().activeSessionId;
                if (sid)
                  await persistMessage(sid, {
                    role: "ASSISTANT",
                    content: workflow.completion.message,
                    type: "WORKFLOW_COMPLETE",
                  });
              }
            }
            clearSession();
          }
          return;
        }

        const uiSchema = UI_SCHEMA_REGISTRY[step.ui?.schema ?? ""] ?? null;
        const parsedUi = buildUiFromData(uiSchema, {
          ...(data.stepData ?? {}),
          ...(data.sessionContext ?? {}),
        });

        const stepLabel = `**${step.name}**${step.optional ? " (optional)" : ""} — ${step.description}`;

        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: parsedUi ?? buildMarkdownNode(stepLabel),
          workflowSnapshot: {
            workflowId: workflow.id,
            stepIndex,
            stepId: step.id,
            contextAtStep: ctx,
          },
        });

        // Persist the step label so it appears in the message history on resume.
        if (persist) {
          const sid = emrChatStore.getState().activeSessionId;
          if (sid)
            await persistMessage(sid, {
              role: "ASSISTANT",
              content: stepLabel,
              type: "WORKFLOW_STEP",
            });
        }

        setWorkflow(workflow, stepIndex);
      } catch (err) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: buildMarkdownNode(
            `⚠️ Failed to load step: ${err instanceof Error ? err.message : "Unknown error"}`,
          ),
        });
      } finally {
        setLoading(false);
      }
    },
    // loadWorkflowStep is used inside itself — stable refs required.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      addMessage,
      setLoading,
      mergeContext,
      setWorkflow,
      clearSession,
      persistMessage,
    ],
  );

  // ── Skip optional step ────────────────────────────────────────────────────

  const skipCurrentStep = useCallback(async () => {
    if (!activeWorkflow || currentStepIndex === null) return;
    const steps = getSortedSteps(activeWorkflow);
    const skippedStep = steps[currentStepIndex];
    const nextIndex =
      currentStepIndex + 1 < steps.length ? currentStepIndex + 1 : null;

    const skipText = `**${skippedStep.name}** was skipped.`;
    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      ui: buildMarkdownNode(skipText),
    });
    if (activeSessionId)
      await persistMessage(activeSessionId, {
        role: "ASSISTANT",
        content: skipText,
        type: "WORKFLOW_STEP",
      });

    if (nextIndex !== null) {
      setWorkflow(activeWorkflow, nextIndex);
      // Persist the step advance.
      if (dbWorkflowStateId) {
        await updateWorkflowStateAction({
          id: dbWorkflowStateId,
          payload: { currentStepIndex: nextIndex },
        });
      }
      await loadWorkflowStep(activeWorkflow, nextIndex, sessionContext);
    } else {
      if (activeWorkflow.completion?.message) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: buildMarkdownNode(activeWorkflow.completion.message),
        });
        await persistMessage(activeSessionId!, {
          role: "ASSISTANT",
          content: activeWorkflow.completion.message,
          type: "WORKFLOW_COMPLETE",
        });
      }
      if (dbWorkflowStateId) {
        // Save the final accumulated context so a completed workflow's full
        // session context is queryable — not just the second-to-last step's.
        await updateWorkflowStateAction({
          id: dbWorkflowStateId,
          payload: { status: "COMPLETED", sessionContext },
        });
      }
      clearSession();
      setDbWorkflowStateId(null);
    }
  }, [
    activeWorkflow,
    currentStepIndex,
    sessionContext,
    setWorkflow,
    loadWorkflowStep,
    clearSession,
    dbWorkflowStateId,
    addMessage,
    activeSessionId,
    persistMessage,
  ]);

  // ── Abandon workflow ──────────────────────────────────────────────────────

  const abandonWorkflow = useCallback(async () => {
    if (dbWorkflowStateId) {
      await updateWorkflowStateAction({
        id: dbWorkflowStateId,
        payload: { status: "ABANDONED" },
      });
    }

    const sessionId = activeSessionId ?? activeSessionId;
    if (sessionId) {
      await persistMessage(sessionId, {
        role: "ASSISTANT",
        content: "Workflow was abandoned.",
        type: "WORKFLOW_ABANDONED",
      });
    }

    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      ui: buildMarkdownNode("Workflow abandoned. How else can I help you?"),
    });

    clearSession();
    setDbWorkflowStateId(null);
  }, [
    dbWorkflowStateId,
    activeSessionId,
    addMessage,
    clearSession,
    persistMessage,
  ]);

  // ── Dispatch handler (A2UI form submit) ───────────────────────────────────

  useEffect(() => {
    const handleDispatch = async (event: Event) => {
      const { message, resolve } = (event as CustomEvent).detail;
      const actionName: string = message.userAction.name;
      const context: Record<string, unknown> = message.userAction.context ?? {};

      // Always read fresh state from the store to avoid stale closure captures.
      const state = useChatStore.getState();
      const currentWorkflow = state.activeWorkflow;
      const currentStepIdx = state.currentStepIndex;
      const currentCtx = state.sessionContext;

      mergeContext(context);

      if (!currentWorkflow || currentStepIdx === null) {
        resolve([]);
        return;
      }

      const steps = getSortedSteps(currentWorkflow);
      const currentStepDef = steps[currentStepIdx];
      const toolMsgId = crypto.randomUUID();

      addMessage({
        id: toolMsgId,
        role: "assistant",
        toolCall: {
          toolName: actionName,
          formData: context,
          status: "pending",
        },
        workflowSnapshot: {
          workflowId: currentWorkflow.id,
          stepIndex: currentStepIdx,
          stepId: currentStepDef?.id ?? "",
          contextAtStep: { ...currentCtx, ...context },
        },
      });

      try {
        const res = await fetch("/api/workflow/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow: currentWorkflow,
            stepIndex: currentStepIdx,
            actionName,
            formData: context,
            sessionContext: { ...currentCtx, ...context },
          }),
        });

        const data = await res.json();

        if (data.success) {
          updateMessage(toolMsgId, {
            toolCall: {
              toolName: actionName,
              formData: context,
              result: data.data,
              status: "success",
            },
          });

          // Persist the tool call so the submission bubble survives session reload.
          const toolSuccessSid = emrChatStore.getState().activeSessionId;
          if (toolSuccessSid) {
            await persistMessage(toolSuccessSid, {
              role: "ASSISTANT",
              content: `**${actionName}** submitted`,
              type: "WORKFLOW_STEP",
              metadata: {
                toolCall: {
                  toolName: actionName,
                  formData: context,
                  result: data.data,
                  status: "success",
                },
              },
            });
          }

          if (data.sessionContext) mergeContext(data.sessionContext);

          const newCtx = data.sessionContext ?? {};

          // Persist step submission to DB.
          const wfStateId = emrChatStore.getState().activeSessionId
            ? dbWorkflowStateId
            : null;

          if (wfStateId) {
            await addStepSubmissionAction({
              payload: {
                workflowStateId: wfStateId,
                stepIndex: currentStepIdx,
                stepId: currentStepDef?.id ?? "",
                stepName: currentStepDef?.name ?? "",
                actionName,
                formData: context,
                responseData: data.data as Record<string, unknown>,
                extractedOutputs: newCtx,
              },
            });

            if (data.nextStepIndex !== null) {
              await updateWorkflowStateAction({
                id: wfStateId,
                payload: {
                  currentStepIndex: data.nextStepIndex,
                  sessionContext: { ...currentCtx, ...newCtx },
                },
              });
            } else {
              // Save final accumulated context so it's queryable after completion.
              await updateWorkflowStateAction({
                id: wfStateId,
                payload: {
                  status: "COMPLETED",
                  sessionContext: { ...currentCtx, ...newCtx },
                },
              });
            }
          }

          if (data.nextStepIndex !== null) {
            setWorkflow(currentWorkflow, data.nextStepIndex);
            await loadWorkflowStep(currentWorkflow, data.nextStepIndex, newCtx);
          } else {
            if (currentWorkflow.completion?.message) {
              addMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                ui: buildMarkdownNode(currentWorkflow.completion.message),
              });
              const completeSid = emrChatStore.getState().activeSessionId;
              if (completeSid)
                await persistMessage(completeSid, {
                  role: "ASSISTANT",
                  content: currentWorkflow.completion.message,
                  type: "WORKFLOW_COMPLETE",
                });
            }
            clearSession();
            setDbWorkflowStateId(null);
          }
        } else {
          updateMessage(toolMsgId, {
            toolCall: {
              toolName: actionName,
              formData: context,
              status: "error",
              error: data.error || "Submission failed",
            },
          });

          // Persist the tool call failure so the bubble survives session reload.
          const toolErrSid = emrChatStore.getState().activeSessionId;
          if (toolErrSid) {
            await persistMessage(toolErrSid, {
              role: "ASSISTANT",
              content: `**${actionName}** failed`,
              type: "WORKFLOW_STEP",
              metadata: {
                toolCall: {
                  toolName: actionName,
                  formData: context,
                  status: "error",
                  error: data.error || "Submission failed",
                },
              },
            });
          }

          // Surface a permission denied card below the tool call when the server
          // returns missing_permissions — gives the user clear, actionable feedback.
          if (Array.isArray(data.missing_permissions)) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              permissionDenied: {
                message: data.error || "You do not have permission to run this workflow.",
                missing_permissions: data.missing_permissions,
              },
            });
          }
        }
      } catch (err) {
        const netErrMsg = err instanceof Error ? err.message : "Network error";
        updateMessage(toolMsgId, {
          toolCall: {
            toolName: actionName,
            formData: context,
            status: "error",
            error: netErrMsg,
          },
        });

        // Persist network failure so the bubble survives session reload.
        const netErrSid = emrChatStore.getState().activeSessionId;
        if (netErrSid) {
          await persistMessage(netErrSid, {
            role: "ASSISTANT",
            content: `**${actionName}** failed`,
            type: "WORKFLOW_STEP",
            metadata: {
              toolCall: {
                toolName: actionName,
                formData: context,
                status: "error",
                error: netErrMsg,
              },
            },
          });
        }
      }

      resolve([]);
    };

    processor.addEventListener("dispatch", handleDispatch);
    return () => processor.removeEventListener("dispatch", handleDispatch);
  }, [
    addMessage,
    updateMessage,
    mergeContext,
    setWorkflow,
    clearSession,
    loadWorkflowStep,
    dbWorkflowStateId,
    persistMessage,
  ]);

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // 1. Add to in-memory store.
    addMessage({ id: crypto.randomUUID(), role: "user", text });
    setInput("");
    setLoading(true);

    // 2. Ensure a DB session exists, creating one on first send.
    let sessionId: string;
    try {
      sessionId = await ensureSession(text);
    } catch {
      setLoading(false);
      return;
    }

    // 3. Set session title from first user message.
    const isFirstMessage =
      useChatStore.getState().messages.filter((m) => m.role === "user")
        .length === 1;
    if (isFirstMessage) {
      const title = titleFromMessage(text);
      updateSessionTitle(sessionId, title);
    }

    // 4. Persist user message.
    await persistMessage(sessionId, { role: "USER", content: text });

    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionContext: {
            ...sessionContext,
            user_id: userId,
            org_id: orgId,
          },
        }),
      });

      const data = await res.json();

      if (data.type === "workflow_step") {
        const workflow: WorkflowDefinition = data.workflow;
        const step: WorkflowStepDefinition = data.step;
        const stepIndex: number = data.stepIndex ?? 0;
        const steps = getSortedSteps(workflow);

        // Persist workflow introduction message.
        const introText =
          workflow.introduction ?? `Starting: **${workflow.name}**`;
        if (workflow.introduction) {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            ui: buildMarkdownNode(introText),
          });
        }

        if (data.sessionContext) mergeContext(data.sessionContext);

        // Abandon any previous in-progress workflow before starting a new one.
        if (dbWorkflowStateId) {
          await updateWorkflowStateAction({
            id: dbWorkflowStateId,
            payload: { status: "ABANDONED" },
          });
          // Persist the abandonment so it appears in session history on resume.
          await persistMessage(sessionId, {
            role: "ASSISTANT",
            content: "Workflow was abandoned.",
            type: "WORKFLOW_ABANDONED",
          });
          setDbWorkflowStateId(null);
        }

        // Persist WORKFLOW_START message + workflow state row.
        await persistMessage(sessionId, {
          role: "ASSISTANT",
          content: introText,
          type: "WORKFLOW_START",
        });

        const [wfStateRow] = await createWorkflowStateAction({
          payload: {
            sessionId,
            workflowDefinition: workflow as unknown as Record<string, unknown>,
            workflowId: workflow.id,
            workflowName: workflow.name,
            totalSteps: steps.length,
            sessionContext: {
              ...sessionContext,
              ...(data.sessionContext ?? {}),
              user_id: userId,
              org_id: orgId,
            },
          },
        });

        if (wfStateRow) setDbWorkflowStateId(wfStateRow.id);

        if (step.step_type === "context") {
          const nextIndex = stepIndex + 1 < steps.length ? stepIndex + 1 : null;
          if (nextIndex !== null) {
            setWorkflow(workflow, nextIndex);
            await loadWorkflowStep(
              workflow,
              nextIndex,
              data.sessionContext ?? {},
            );
          }
          return;
        }

        const uiSchema = UI_SCHEMA_REGISTRY[step.ui?.schema ?? ""] ?? null;
        const parsedUi = buildUiFromData(uiSchema, {
          ...(data.stepData ?? {}),
          ...(data.sessionContext ?? {}),
        });

        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui:
            parsedUi ??
            buildMarkdownNode(
              `**${step.name}**${step.optional ? " (optional)" : ""} — ${step.description}`,
            ),
          workflowSnapshot: {
            workflowId: workflow.id,
            stepIndex,
            stepId: step.id,
            contextAtStep: data.sessionContext ?? {},
          },
        });

        setWorkflow(workflow, stepIndex);
      } else if (data.type === "error") {
        if (Array.isArray(data.missing_permissions)) {
          // Permission denied — show actionable card instead of a generic string.
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            permissionDenied: {
              message: data.message,
              missing_permissions: data.missing_permissions,
            },
          });
          await persistMessage(sessionId, {
            role: "ASSISTANT",
            content: data.message ?? "Permission denied.",
            type: "TEXT",
          });
        } else {
          const errText = `⚠️ ${data.message ?? "Something went wrong."}`;
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            ui: buildMarkdownNode(errText),
          });
          await persistMessage(sessionId, {
            role: "ASSISTANT",
            content: errText,
            type: "TEXT",
          });
        }
      } else {
        const responseText =
          data.message ?? JSON.stringify(data, null, 2);

        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          ui: buildMarkdownNode(responseText),
        });

        // Persist text response.
        await persistMessage(sessionId, {
          role: "ASSISTANT",
          content: responseText,
          type: "TEXT",
        });
      }
    } catch (err) {
      const errText = `⚠️ Network error: ${err instanceof Error ? err.message : "Unknown error"}`;
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        ui: buildMarkdownNode(errText),
      });
      await persistMessage(sessionId, {
        role: "ASSISTANT",
        content: errText,
        type: "TEXT",
      });
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    addMessage,
    setInput,
    setLoading,
    sessionContext,
    mergeContext,
    setWorkflow,
    clearSession,
    loadWorkflowStep,
    ensureSession,
    persistMessage,
    userId,
    orgId,
    updateSessionTitle,
    dbWorkflowStateId,
    setDbWorkflowStateId,
  ]);

  // ── Keyboard shortcut ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const currentStepIsOptional =
    activeWorkflow !== null &&
    currentStepIndex !== null &&
    getSortedSteps(activeWorkflow)[currentStepIndex]?.optional === true;

  const activeWorkflowName =
    activeWorkflow !== null && currentStepIndex !== null
      ? activeWorkflow.name
      : undefined;

  const activeSessionTitle = sessions.find(
    (s) => s.id === activeSessionId,
  )?.title;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100dvh-160px)] overflow-hidden rounded-lg border border-border bg-background">
      {/* Top bar */}
      <ChatTopbar
        title={activeSessionTitle}
        hasActiveWorkflow={activeWorkflow !== null}
        workflowName={activeWorkflowName}
        onNewChat={() => startTransition(startNewChat)}
        onOpenHistory={openHistory}
      />

      {/* Workflow progress banner */}
      {activeWorkflow !== null && currentStepIndex !== null && (
        <WorkflowProgressBanner
          workflowName={activeWorkflow.name}
          currentStepIndex={currentStepIndex}
          totalSteps={getSortedSteps(activeWorkflow).length}
          onAbandon={abandonWorkflow}
        />
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 py-6">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <SessionGreeting
                onSuggestion={(prompt) => {
                  setInput(prompt);
                  inputRef.current?.focus();
                }}
              />
            ) : (
              <div className="flex flex-col gap-5">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="shrink-0 flex size-8 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="size-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        msg.role === "user" ? "max-w-[70%]" : "flex-1 min-w-0",
                      )}
                    >
                      {msg.text && (
                        <p className="inline-block rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground leading-relaxed">
                          {msg.text}
                        </p>
                      )}

                      {msg.ui && (
                        <div
                          className={cn(
                            msg.role === "assistant" &&
                              "rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3",
                          )}
                        >
                          <Renderer
                            processor={processor}
                            surfaceId={`surface-${msg.id}`}
                            component={msg.ui}
                          />
                        </div>
                      )}

                      {msg.toolCall && (
                        <div className="mt-2">
                          <ToolCallDetails toolCall={msg.toolCall} />
                        </div>
                      )}

                      {msg.permissionDenied && (
                        <div className="mt-2">
                          <PermissionDeniedMessage
                            message={msg.permissionDenied.message}
                            missingPermissions={msg.permissionDenied.missing_permissions}
                          />
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="shrink-0 flex size-8 items-center justify-center rounded-full bg-muted">
                        <User className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="shrink-0 flex size-8 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="flex gap-2 items-center rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                      <Skeleton className="h-2 w-16 rounded" />
                      <Skeleton className="h-2 w-24 rounded" />
                      <Skeleton className="h-2 w-10 rounded" />
                    </div>
                  </div>
                )}

                <div ref={scrollRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skip optional step bar */}
      {currentStepIsOptional && !loading && (
        <div className="border-t border-border bg-background px-4 py-2 shrink-0">
          <div className="max-w-4xl mx-auto flex justify-end">
            <Button variant="ghost" size="sm" onClick={skipCurrentStep}>
              <SkipForward className="size-4 mr-2" />
              Skip this step
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border bg-background p-4 shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Try "create a patient" or ask anything…'
            disabled={loading}
            rows={1}
            className="flex-1 min-h-0 max-h-32 resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0 size-10"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* History sidebar */}
      <SessionSidebar
        isOpen={isHistoryOpen}
        onClose={closeHistory}
        sessions={sessions}
        activeSessionId={activeSessionId}
        isLoading={isLoadingSessions}
        onSelectSession={openSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={startNewChat}
      />
    </div>
  );
}
