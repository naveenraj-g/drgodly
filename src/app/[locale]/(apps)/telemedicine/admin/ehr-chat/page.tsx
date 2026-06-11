/**
 * EHR Chat page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/ehr-chat
 *
 * Conversational FHIR workflow assistant. Users describe what they need in
 * natural language (e.g. "register a new patient", "book an appointment for
 * John Smith") and the system resolves the intent to the matching FHIR workflow,
 * then renders the form steps inline in the chat interface.
 */

import A2UIChatPage from "@/modules/client/ai-hub/components/A2UIChat";

/**
 * EHR Chat — AI-assisted FHIR data entry and retrieval via conversational UI.
 */
export default function EHRChatPage() {
  return <A2UIChatPage />;
}
