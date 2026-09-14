/**
 * agents.data.ts — content for every AI agent page under
 * /docs/mobile-guide/agents/[agent].
 *
 * Layer: client / docs / data
 *
 * Single source of truth for the AI agent reference: each entry drives one
 * generated page via app/docs/mobile-guide/agents/[agent]/page.tsx. Mirrors
 * the exact contract this app's own src/app/api/*-agent/route.ts proxies
 * already forward — a mobile client hits the agent host directly with its
 * own bearer JWT (see /docs/mobile-guide/auth), skipping our Next.js proxy
 * layer entirely, since that layer exists only to mint the JWT from a
 * browser cookie the mobile app never has in the first place.
 *
 * Two agent-adjacent routes are deliberately NOT here:
 *  - /api/data-fetch: a generic authenticated FHIR-read proxy backing admin
 *    data-grid widgets, not an agent chat — irrelevant to the patient/doctor
 *    mobile app.
 *  - /api/workflow/*: the "EMR guided workflow" tool. It requires a Better
 *    Auth session cookie (not a bearer token) plus per-workflow permissions,
 *    and is only used on doctor/admin EMR pages, not the core patient/doctor
 *    journeys — mobile can't call it as-is without new bearer-gated proxies.
 */

import type { AgentDoc } from "@/modules/client/docs/types";

export const AGENTS: AgentDoc[] = [
  {
    slug: "intake",
    title: "Intake Agent",
    envVar: "INTAKE_AGENT_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/intake",
    description: "Conversational pre-appointment intake — gathers symptoms from the patient before they book a doctor.",
    usage: { patient: "Patient intake chat, before booking an appointment." },
    method: "POST",
    path: "/",
    requestExample: { message: "I've had a headache for 3 days", session_id: null },
    streaming: true,
    sessionContinuity:
      "X-Session-Id response header on the first call (preferred), and the same id also appears inside the agent_end event as a " +
      "fallback. Send whichever you have back as session_id on every subsequent call in the same conversation; send null on the very first call.",
    events: [
      { type: "text_delta", description: "One incremental chunk of assistant reply text.", example: { type: "text_delta", data: { content: "Hello" } } },
      { type: "text_complete", description: "Marks the current reply as finished. Carries no content — treat as a no-op marker.", example: { type: "text_complete" } },
      { type: "agent_end", description: "End of turn; carries the session id to persist for the next call.", example: { type: "agent_end", session_id: "abc-123" } },
    ],
  },
  {
    slug: "consultation",
    title: "Consultation Agent",
    envVar: "CONSULTATION_AGENT_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/consult",
    description: "Byte-identical contract to the Intake Agent — a text-based AI consultation the patient can have without booking a doctor at all.",
    usage: { patient: "Patient direct-to-AI text consultation chat." },
    method: "POST",
    path: "/",
    requestExample: { message: "My back pain hasn't improved with rest", session_id: null },
    streaming: true,
    sessionContinuity: "Identical mechanism to the Intake Agent: X-Session-Id header, with agent_end.session_id as a fallback.",
    events: [
      { type: "text_delta", description: "One incremental chunk of assistant reply text.", example: { type: "text_delta", data: { content: "I understand" } } },
      { type: "text_complete", description: "Marks the current reply as finished; no content.", example: { type: "text_complete" } },
      { type: "agent_end", description: "End of turn; carries the session id.", example: { type: "agent_end", session_id: "def-456" } },
    ],
  },
  {
    slug: "assessment-plan",
    title: "Assessment Plan Agent",
    envVar: "ASSESSMENT_PLAN_AGENT_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/assessment",
    description:
      "Turns a finished intake/consultation transcript into a structured clinical report (risk level, differential diagnosis). " +
      "Called once, at the end of a conversation — not a chat itself.",
    usage: { patient: "Called automatically when the patient ends an intake or AI-consultation chat, to build the saved report." },
    method: "POST",
    path: "/",
    requestExample: { conversation: ["patient: I've had a headache for 3 days", "appointment-intake-agent: How severe is it, 1 to 10?"] },
    streaming: false,
    responseExample: {
      risk_level: "low",
      differential_diagnosis: [{ condition: "Tension headache", likelihood: "high" }],
      recommended_action: "Monitor; see a doctor if symptoms worsen or persist beyond a week.",
    },
  },
  {
    slug: "clinical-extraction",
    title: "Clinical Extraction Agent",
    envVar: "AGENT_CLINICAL_API_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/clinical-extraction",
    description: "Converts a doctor's SOAP note into structured FHIR-ready resource suggestions (conditions, observations, medications, orders).",
    usage: { doctor: "Clinical Records workspace's \"re-extract\" action, after editing the SOAP note." },
    method: "POST",
    path: "/",
    requestExample: { soap: { subjective: "Patient reports recurring headaches", objective: "BP 120/80, alert and oriented", assessment: "Tension headache", plan: "OTC analgesics, follow up in 2 weeks", summary: "Routine follow-up" }, assessment: null },
    streaming: false,
    responseExample: {
      conditions: [{ display: "Migraine", terminologySystem: "ICD-10" }],
      observations: [{ display: "Pain scale", terminologySystem: "LOINC", value: "7", unit: "/10" }],
      medicationRequests: [{ display: "Sumatriptan", terminologySystem: "RxNorm", dose: "50mg", frequency: "PRN", duration: "—", route: "oral" }],
      serviceRequests: [{ display: "MRI Brain", terminologySystem: "LOINC" }],
    },
  },
  {
    slug: "full-report",
    title: "Full Report Agent",
    envVar: "ASSESSMENT_PLAN_AGENT_URL + DOCTOR_REPORT_AGENT_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/consultation-workflow",
    description:
      "Merges a SOAP report and an assessment plan into one final consultation report. Our Next.js proxy calls two upstream " +
      "agents in parallel and merges their results — a mobile client replicating this directly needs to call both agents " +
      "itself and merge the same way (or just call each agent separately, per the individual contracts documented here).",
    usage: { doctor: "End-of-call in both video (DoctorConsult) and in-person consultation flows." },
    method: "POST",
    path: "/",
    notes:
      "Payload shape sent to this pair of agents has been observed inconsistently across the web app's own call sites — " +
      "flattened speaker-prefixed strings from one screen, structured {speaker,text,timestamp} objects from another. " +
      "Confirm the exact expected shape against the live agent before building on this.",
    requestExample: { conversation: [{ speaker: "DOCTOR", text: "How have you been feeling?", timestamp: "2026-01-15T09:00:00Z" }, { speaker: "PATIENT", text: "Better, thank you.", timestamp: "2026-01-15T09:00:05Z" }] },
    streaming: false,
    responseExample: { soap_report: { subjective: "...", objective: "...", assessment: "...", plan: "...", summary: "..." }, assessment_plan: { risk_level: "low" }, generated_at: "2026-01-15T09:30:00Z" },
  },
  {
    slug: "document-chat",
    title: "Document Chat Agent",
    envVar: "DOCUMENT_AGENT_API_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/document",
    description: "Ask questions about a specific uploaded document — the agent retrieves relevant chunks from that file before answering.",
    usage: { doctor: "Clinical Records document preview's \"Chat\" tab (DocumentChatPanel)." },
    method: "POST",
    path: "/",
    requestExample: { file_id: "fn_abc123", message: "What's abnormal in this result?", patient_id: "10001", session_id: "" },
    streaming: true,
    sessionContinuity: "X-Session-Id response header — pass it back as session_id on the next question about the same document.",
    events: [
      { type: "text_delta", description: "One incremental chunk of assistant reply text.", example: { type: "text_delta", data: { content: "This" } } },
      { type: "text_complete", description: "Full, final assistant reply text for this turn.", example: { type: "text_complete", data: { content: "This result shows..." } } },
      { type: "tool_call_start", description: "The agent began a retrieval tool call — safe to ignore in the UI.", example: { type: "tool_call_start" } },
      { type: "tool_call_complete", description: "The retrieval tool call finished — safe to ignore in the UI.", example: { type: "tool_call_complete" } },
    ],
  },
  {
    slug: "pdf-chat",
    title: "PDF Chat Agent",
    envVar: "PDF_CHAT_AGENT_API_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/pdf-chat",
    description: "Newer alternate to the Document Chat Agent. Takes the actual file bytes instead of a file id.",
    usage: { doctor: "Clinical Records document preview's \"Chat\" tab, temporary alternate implementation (PdfChatPanel)." },
    method: "POST",
    path: "/",
    contentType: "multipart/form-data",
    notes:
      "Our Next.js proxy resolves a FileNest file_id to bytes server-side before forwarding — the agent itself only ever sees " +
      "multipart form fields. Calling this directly, fetch the file's bytes yourself first (see /docs/mobile-guide/attachments), " +
      "then POST it as multipart — you cannot send {file_id, message} JSON, that shortcut only exists in our proxy.",
    requestExample: "FormData: message=<string question>, file=<binary file content, with its real filename and content-type>",
    streaming: true,
    events: [
      { type: "text_delta", description: "One incremental chunk of assistant reply text.", example: { type: "text_delta", data: { content: "This", agent: "pdf_chat" } } },
      { type: "text_complete", description: "Full, final assistant reply text for this turn.", example: { type: "text_complete", data: { content: "This report is a Body Temperature Monitoring Report...", agent: "pdf_chat" } } },
    ],
  },
  {
    slug: "doctor-assistant",
    title: "Doctor Assistant Agent (MCP)",
    envVar: "MCP_AGENT_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/mcpagent",
    description:
      "Tool-calling assistant for the doctor dashboard — can query a patient's labs, appointment history, etc. mid-conversation " +
      "via MCP tool calls before answering.",
    usage: { doctor: "Doctor dashboard's assistant chat (DoctorAssistant)." },
    method: "POST",
    path: "/",
    notes: "When a specific appointment is selected, prefix the message with FHIR context, e.g. \"[FHIR context: appointment_id=123, patient_id=456, encounter_id=789]\\n\\n<question>\", so the agent's tool calls resolve against the right patient.",
    requestExample: { message: "[FHIR context: appointment_id=123, patient_id=456, encounter_id=789]\n\nSummarize this patient's recent labs", session_id: null },
    streaming: true,
    sessionContinuity: "X-Session-Id response header, with agent_end.session_id as a fallback — same dual mechanism as Intake/Consultation.",
    events: [
      { type: "text_delta", description: "One incremental chunk of assistant reply text (field is message, not data.content).", example: { type: "text_delta", message: "Based on the recent labs..." } },
      { type: "text_complete", description: "Marks the current reply as finished; no content.", example: { type: "text_complete" } },
      { type: "tool_start", description: "The agent is calling a tool — render this so the doctor sees what data is being pulled.", example: { type: "tool_start", tool: "query_patient_labs", arguments: { patient_id: 456 } } },
      { type: "tool_result", description: "The tool call's result.", example: { type: "tool_result", tool: "query_patient_labs", output: "{\"hba1c\":6.1}", success: true } },
      { type: "agent_end", description: "End of turn; carries the session id.", example: { type: "agent_end", session_id: "ghi-789" } },
    ],
  },
  {
    slug: "suggestion",
    title: "Suggestion Agent",
    envVar: "DOCTOR_ASSISTANT_AGENT_URL",
    exampleUrl: "https://agents.drgodly.com/api/agent/doctoragent",
    description:
      "Suggests follow-up questions for a doctor to ask, based on the live consultation transcript so far. A different upstream " +
      "from the Doctor Assistant Agent above despite the similar \"doctor assistant\" branding — don't conflate the two.",
    usage: { doctor: "Live consultation screen, refreshed automatically every couple of patient turns." },
    method: "POST",
    path: "/",
    notes: "Stateless — no session id. Each call is independent, capped at the 18 most recent transcript lines.",
    requestExample: { conversation: ["DOCTOR: How long have you had this pain?", "PATIENT: About a week.", "Doctor's notes: possible tension headache"] },
    streaming: false,
    responseExample: { questions: ["Have symptoms worsened at night?", "Any recent changes in sleep or stress?"] },
  },
];
